import { Transaction } from './parser';

/**
 * Simplified categorizer for Bank Statement Imports.
 * As per user request, all imported transactions are marked as "Imported"
 * and will be excluded from analytics until manually categorized.
 */
export function autoCategorize(transactions: Transaction[]): Transaction[] {
  return transactions.map(t => ({
    ...t,
    category: 'Imported'
  }));
}
