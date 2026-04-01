export interface Transaction {
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  balance: number;
  category?: string;
  cleanDescription?: string;
}

export interface StatementSummary {
  totalIn: number;
  totalOut: number;
  net: number;
}

export interface ExtractionResult {
  transactions: Transaction[];
  summary: StatementSummary;
  bank: string;
}

/**
 * Normalizes various Indian bank date formats to YYYY-MM-DD
 */
function normalizeDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  
  // Clean up the string
  const cleanStr = dateStr.replace(/,/g, '').trim();
  
  // Common format: DD/MM/YY or DD/MM/YYYY
  if (cleanStr.includes('/')) {
    const parts = cleanStr.split('/');
    if (parts.length === 3) {
      let [d, m, y] = parts;
      if (y.length === 2) y = '20' + y;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }

  // Common format: DD-MMM-YY (e.g., 21-May-24)
  if (cleanStr.includes('-')) {
    const months: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      let [d, m, y] = parts;
      const monthNum = months[m.toLowerCase().substring(0, 3)];
      if (monthNum) {
        if (y.length === 2) y = '20' + y;
        return `${y}-${monthNum}-${d.padStart(2, '0')}`;
      }
    }
  }

  // Fallback to JS Date if possible
  try {
    const d = new Date(cleanStr);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  } catch (e) {}

  return new Date().toISOString().split('T')[0];
}

const DATE_REGEX = /\d{1,2}[\/\-\. ](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{1,2})[\/\-\. ](?:\d{2,4})/i;

/** An item with its x-position extracted for convenience */
interface PosItem {
  str: string;
  x: number;
}

/**
 * Represents a "logical" transaction row which may span multiple PDF rows.
 * The first row has the date; continuation rows only have narration text.
 */
interface LogicalRow {
  items: PosItem[];       // all items from the date-row
  continuationText: string; // concatenated text from continuation rows
}

export class SpatialParser {
  private pdfjs: any = null;

  private async loadPdfjs() {
    if (this.pdfjs) return this.pdfjs;
    const pdfjs = await import('pdfjs-dist');
    if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    }
    this.pdfjs = pdfjs;
    return pdfjs;
  }

  async parse(fileContent: Uint8Array, password = ''): Promise<ExtractionResult> {
    const pdfjs = await this.loadPdfjs();
    const loadingTask = pdfjs.getDocument({ 
      data: fileContent,
      password: password 
    });
    
    let pdf;
    try {
      pdf = await loadingTask.promise;
    } catch (err: any) {
      if (err.name === 'PasswordException') {
        throw new Error('PASSWORD_REQUIRED');
      }
      throw err;
    }

    // Collect ALL rows from all pages into one flat array
    let allRows: PosItem[][] = [];
    let detectedBank = 'Generic';
    let headerFound = false;
    let headerColumnLayout: { withdrawalX: number; depositX: number; balanceX: number } | null = null;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      if (textContent.items.length === 0) continue;

      const rows = this.clusterByY(textContent.items as any[]);

      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        const rowItems: PosItem[] = row.map((item: any) => ({
          str: item.str,
          x: Math.round(item.transform[4])
        }));
        const rowText = rowItems.map(i => i.str.toUpperCase()).join(' ');

        // Detect bank
        if (rowText.includes('HDFC BANK')) detectedBank = 'HDFC';
        else if (rowText.includes('STATE BANK') || rowText.includes('SBI')) detectedBank = detectedBank === 'Generic' ? 'SBI' : detectedBank;
        else if (rowText.includes('AXIS BANK')) detectedBank = detectedBank === 'Generic' ? 'Axis' : detectedBank;
        else if (rowText.includes('ICICI BANK')) detectedBank = detectedBank === 'Generic' ? 'ICICI' : detectedBank;

        // Detect the header row and learn column positions
        if (!headerFound) {
          const keywords = ['DATE', 'NARRATION', 'DESCRIPTION', 'WITHDRAWAL', 'DEPOSIT', 'AMOUNT', 'BALANCE', 'PARTICULARS'];
          const matchCount = keywords.filter(k => rowText.includes(k)).length;
          if (matchCount >= 3) {
            headerFound = true;
            headerColumnLayout = this.learnColumnLayout(rowItems);
            continue; // skip the header row itself
          }
        }

        if (!headerFound) continue;

        // Skip known footer/non-data rows
        if (this.isFooterOrMeta(rowText)) continue;
        // Skip the "Statement Summary" section and everything after it
        if (rowText.includes('STATEMENT SUMMARY')) break;

        allRows.push(rowItems);
      }
    }

    if (!headerFound || allRows.length === 0) {
      return { transactions: [], summary: { totalIn: 0, totalOut: 0, net: 0 }, bank: detectedBank };
    }

    // Merge multi-line rows into logical transactions
    const logicalRows = this.mergeMultiLineRows(allRows);

    // Parse each logical row into a transaction
    const allTransactions: Transaction[] = [];
    for (const lr of logicalRows) {
      const trans = this.parseLogicalRow(lr, headerColumnLayout);
      if (trans && trans.amount !== 0) {
        allTransactions.push(trans);
      }
    }

    // Sort by date
    allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const summary = {
      totalIn: allTransactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0),
      totalOut: allTransactions.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0),
      net: 0
    };
    summary.net = summary.totalIn - summary.totalOut;

    return {
      transactions: allTransactions,
      summary,
      bank: detectedBank
    };
  }

  private clusterByY(items: any[]) {
    const rows: Map<number, any[]> = new Map();
    items.forEach(item => {
      if (!item.str || item.str.trim() === '') return;
      const y = Math.round(item.transform[5]);
      let found = false;
      for (const [rowY, rowItems] of rows.entries()) {
        if (Math.abs(rowY - y) <= 2) {
          rowItems.push(item);
          found = true;
          break;
        }
      }
      if (!found) rows.set(y, [item]);
    });
    return Array.from(rows.entries())
      .sort((a, b) => b[0] - a[0])
      .map(entry => entry[1].sort((a: any, b: any) => a.transform[4] - b.transform[4]));
  }

  /**
   * Learn column positions from the header row.
   * Looks for Withdrawal/Debit, Deposit/Credit, and Balance/Closing column x-positions.
   */
  private learnColumnLayout(headerItems: PosItem[]) {
    let withdrawalX = 400;
    let depositX = 490;
    let balanceX = 560;

    for (const item of headerItems) {
      const upper = item.str.toUpperCase();
      if (upper.includes('WITHDRAWAL') || upper.includes('DEBIT') || upper === 'DR') {
        withdrawalX = item.x;
      } else if (upper.includes('DEPOSIT') || upper.includes('CREDIT') || upper === 'CR') {
        depositX = item.x;
      } else if (upper.includes('BALANCE') || upper.includes('CLOSING')) {
        balanceX = item.x;
      }
    }

    return { withdrawalX, depositX, balanceX };
  }

  /**
   * Check if a row is a footer/metadata row that should be skipped.
   */
  private isFooterOrMeta(rowText: string): boolean {
    const skipPatterns = [
      'HDFC BANK LIMITED',
      'CLOSING BALANCE INCLUDES',
      'CONTENTS OF THIS STATEMENT',
      'STATE ACCOUNT BRANCH GSTN',
      'HDFC BANK GSTIN',
      'REGISTERED OFFICE ADDRESS',
      'THIS STATEMENT',
      'THIS IS A COMPUTER GENERATED',
      'DOES NOT REQUIRE SIGNATURE',
      'PAGE NO',
      'ACCOUNT BRANCH',
      'ACCOUNT STATUS',
      'ACCOUNT TYPE',
      'BRANCH CODE',
      'RTGS/NEFT IFSC',
      'A/C OPEN DATE',
      'NOMINATION :',
      'STATEMENT FROM :',
      'JOINT HOLDERS',
      'GENERATED ON:',
      'OPENING BALANCE',
    ];
    return skipPatterns.some(p => rowText.includes(p));
  }

  /**
   * Merge consecutive rows into logical transaction groups.
   * A new logical row starts whenever a row begins with a date at x ~34.
   * Rows without a leading date are continuation narration lines.
   */
  private mergeMultiLineRows(rows: PosItem[][]): LogicalRow[] {
    const logicalRows: LogicalRow[] = [];

    for (const row of rows) {
      const firstItem = row[0];
      const rowText = row.map(i => i.str).join(' ');

      // Check if this row starts a new transaction (has a date in the first item)
      const startsWithDate = firstItem && firstItem.x < 60 && DATE_REGEX.test(firstItem.str);

      if (startsWithDate) {
        // Start a new logical row
        logicalRows.push({ items: row, continuationText: '' });
      } else if (logicalRows.length > 0) {
        // Append as continuation text to the last logical row
        const narrationText = row
          .filter(i => i.x < 280) // Only take narration-area text
          .map(i => i.str)
          .join(' ')
          .trim();
        if (narrationText) {
          const last = logicalRows[logicalRows.length - 1];
          last.continuationText += ' ' + narrationText;
        }
      }
    }

    return logicalRows;
  }

  /**
   * Parse a logical row (date row + continuation lines) into a Transaction.
   * Sorts numeric values by x-position: rightmost = balance, second = amount.
   * The boundary between withdrawal/deposit zones is the midpoint of the
   * withdrawal and deposit header x-positions.
   */
  private parseLogicalRow(
    lr: LogicalRow,
    layout: { withdrawalX: number; depositX: number; balanceX: number } | null
  ): Transaction | null {
    const items = lr.items;
    const fullText = items.map(i => i.str).join(' ') + ' ' + lr.continuationText;

    // Extract date from the first item
    const dateMatch = fullText.match(DATE_REGEX);
    const dateStr = dateMatch ? dateMatch[0] : '';
    const date = normalizeDate(dateStr);

    let debit = 0;
    let credit = 0;
    let balance = 0;

    // Collect all numeric items past the value-date area (x > 380)
    // This skips the date, narration, ref-number, and value-date columns
    const numericItems = items
      .filter(i => {
        const cleaned = i.str.replace(/,/g, '').replace(/[^\d.-]/g, '');
        const val = parseFloat(cleaned);
        return !isNaN(val) && val > 0 && i.x > 380;
      })
      .map(i => ({
        val: parseFloat(i.str.replace(/,/g, '').replace(/[^\d.-]/g, '')),
        x: i.x
      }))
      .sort((a, b) => a.x - b.x); // Sort left to right

    if (numericItems.length >= 2) {
      // Rightmost = closing balance, second-rightmost = transaction amount
      balance = numericItems[numericItems.length - 1].val;
      const amountItem = numericItems[numericItems.length - 2];

      if (layout) {
        // Use a right-weighted boundary because numeric values are right-aligned.
        // Withdrawal values extend far to the right of the withdrawal header.
        const boundary = layout.withdrawalX + Math.abs(layout.depositX - layout.withdrawalX) * 0.75;
        if (amountItem.x >= boundary) {
          credit = amountItem.val;
        } else {
          debit = amountItem.val;
        }
      } else {
        // No layout — guess from text
        if (fullText.toLowerCase().includes('neft cr') ||
            fullText.toLowerCase().includes('credit interest') ||
            fullText.toLowerCase().includes('cash deposit')) {
          credit = amountItem.val;
        } else {
          debit = amountItem.val;
        }
      }
    } else if (numericItems.length === 1) {
      // Only one numeric value — likely just a balance with no distinct amount
      balance = numericItems[0].val;
    }

    const type = credit > 0 ? 'credit' : 'debit';
    const amount = credit > 0 ? credit : debit;

    // Build clean description from narration items + continuation text
    const narrationItems = items
      .filter(i => i.x >= 60 && i.x < 280)
      .map(i => i.str)
      .join(' ');
    const description = (narrationItems + ' ' + lr.continuationText).replace(/\s+/g, ' ').trim();

    return {
      date,
      description: description || fullText.replace(dateStr, '').replace(/[\d,]+\.\d{2}/g, '').trim(),
      amount: Math.abs(amount),
      type,
      balance
    };
  }
}

