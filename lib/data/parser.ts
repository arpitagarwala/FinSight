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

    let allTransactions: Transaction[] = [];
    let detectedBank = 'Generic';
    let foundHeader = false;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      if (textContent.items.length === 0) continue;

      const rows = this.clusterByY(textContent.items as any[]);
      const { headerRowIndex, tableData, bank } = this.identifyTable(rows);
      if (bank !== 'Generic') detectedBank = bank;

      if (headerRowIndex !== -1) {
          // Header found on this page – extract rows after the header
          foundHeader = true;
          const pageTransactions = this.extractTransactions(tableData);
          allTransactions = [...allTransactions, ...pageTransactions];
      } else if (foundHeader) {
          // Continuation page with no header – treat ALL rows as potential data
          const pageTransactions = this.extractTransactions(rows);
          allTransactions = [...allTransactions, ...pageTransactions];
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
      .map(entry => entry[1].sort((a, b) => a.transform[4] - b.transform[4]));
  }

  private identifyTable(rows: any[][]) {
    let headerRowIndex = -1;
    let detectedBank = 'Generic';
    const keywords = ['DATE', 'DESCRIPTION', 'NARRATION', 'WITHDRAWAL', 'DEPOSIT', 'AMOUNT', 'BALANCE', 'PARTICULARS'];

    for (let i = 0; i < rows.length; i++) {
        const rowText = rows[i].map(item => item.str.toUpperCase()).join(' ');
        const matchCount = keywords.filter(k => rowText.includes(k)).length;
        if (matchCount >= 2) {
            headerRowIndex = i;
            break;
        }
    }

    return {
        headerRowIndex,
        tableData: headerRowIndex !== -1 ? rows.slice(headerRowIndex + 1) : [],
        bank: detectedBank
    };
  }

  private extractTransactions(rows: any[][]) {
    const transactions: Transaction[] = [];
    const dateRegex = /\d{1,2}[\/\-\. ](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{1,2})[\/\-\. ](?:\d{2,4})/i;

    for (const row of rows) {
        const rowText = row.map(i => i.str).join(' ');
        if (dateRegex.test(rowText)) {
            const trans = this.parseRow(row);
            if (trans && trans.amount !== 0) {
                transactions.push(trans);
            }
        }
    }
    return transactions;
  }

  private parseRow(items: any[]): Transaction | null {
    const itemsWithX = items.map(i => ({ 
      str: i.str.replace(/,/g, '').trim(), 
      x: i.transform[4] 
    }));
    const fullText = items.map(i => i.str).join(' ');
    
    const dateMatch = fullText.match(/\d{1,2}[\/\-\. ](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{1,2})[\/\-\. ](?:\d{2,4})/i);
    const dateStr = dateMatch ? dateMatch[0] : '';
    const date = normalizeDate(dateStr);

    let debit = 0;
    let credit = 0;
    let balance = 0;

    itemsWithX.forEach(item => {
      const val = parseFloat(item.str.replace(/[^\d.-]/g, ''));
      if (isNaN(val)) return;

      const x = item.x;
      if (x > 540) balance = val;
      else if (x > 460 && x < 540) credit = val;
      else if (x > 380 && x < 460) debit = val;
    });

    if (debit === 0 && credit === 0) {
        const amounts = itemsWithX
            .map(i => parseFloat(i.str.replace(/[^\d.-]/g, '')))
            .filter(v => !isNaN(v) && v !== 0);
        
        if (amounts.length >= 2) {
            balance = amounts[amounts.length - 1];
            const amt = amounts[amounts.length - 2];
            if (fullText.toLowerCase().includes('cr') || fullText.toLowerCase().includes('dep')) credit = amt;
            else debit = amt;
        } else if (amounts.length === 1) {
            debit = amounts[0];
        }
    }

    const type = credit > 0 ? 'credit' : 'debit';
    const amount = credit > 0 ? credit : debit;
    const description = fullText.replace(dateStr, '').replace(/[0-9,]+\.[0-9]{2}/g, '').trim();

    return {
      date,
      description,
      amount: Math.abs(amount),
      type,
      balance
    };
  }
}
