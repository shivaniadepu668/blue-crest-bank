import { Timestamp } from 'firebase/firestore';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatTimestamp(ts?: Timestamp | null): string {
  if (!ts || typeof ts.toDate !== 'function') {
    return 'Just now';
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(ts.toDate());
}

export function formatDateOnly(ts?: Timestamp | null): string {
  if (!ts || typeof ts.toDate !== 'function') {
    return '—';
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(ts.toDate());
}

export function generateReferenceCode(prefix: string): string {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${ymd}-${rand}`;
}

export function generateAccountNumber(): string {
  const part1 = Math.floor(1000 + Math.random() * 9000);
  const part2 = Math.floor(1000 + Math.random() * 9000);
  return `BC-${part1}-${part2}`;
}

export function generateCustomerCode(): string {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `CUS-${rand}`;
}

export function generateLoanCode(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `LN-${year}-${rand}`;
}

export function calculateMonthlyEmi(
  principal: number,
  annualRatePercent: number,
  termMonths: number
): number {
  if (principal <= 0 || termMonths <= 0) return 0;
  const monthlyRate = annualRatePercent / 12 / 100;
  if (monthlyRate <= 0) {
    return roundCents(principal / termMonths);
  }
  const factor = Math.pow(1 + monthlyRate, termMonths);
  const emi = (principal * monthlyRate * factor) / (factor - 1);
  return roundCents(emi);
}
