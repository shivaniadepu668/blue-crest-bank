import { Timestamp } from 'firebase/firestore';

export type AccountType = 'Savings' | 'Checking' | 'Fixed Deposit';
export type AccountStatus = 'active' | 'frozen' | 'closed';
export type KycStatus = 'pending' | 'verified' | 'suspended';
export type BranchStatus = 'active' | 'closed';
export type TransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'transfer_in'
  | 'transfer_out'
  | 'loan_disbursement'
  | 'loan_repayment';
export type TransactionStatus = 'completed' | 'reversed';
export type LoanType = 'Personal' | 'Home' | 'Auto' | 'Business' | 'Education';
export type LoanStatus = 'pending' | 'active' | 'rejected' | 'paid';

// Validation constants synchronized verbatim with firebase-blueprint.json & firestore.rules
export const BLUEPRINT_LIMITS = {
  ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
  CODE_PATTERN: /^[A-Z0-9-]+$/,
  DOB_PATTERN: /^[0-9-]+$/,
  BRANCH_CODE_MIN: 3,
  BRANCH_CODE_MAX: 20,
  BRANCH_NAME_MAX: 100,
  CITY_MAX: 60,
  STATE_MAX: 60,
  BRANCH_ADDRESS_MAX: 200,
  ROUTING_CODE_MIN: 4,
  ROUTING_CODE_MAX: 24,
  MANAGER_NAME_MAX: 80,
  PHONE_MIN: 7,
  PHONE_MAX: 24,
  CUSTOMER_CODE_MIN: 4,
  CUSTOMER_CODE_MAX: 24,
  FULL_NAME_MIN: 2,
  FULL_NAME_MAX: 100,
  EMAIL_MAX: 120,
  CUSTOMER_ADDRESS_MIN: 5,
  CUSTOMER_ADDRESS_MAX: 250,
  ACCOUNT_NUMBER_MIN: 8,
  ACCOUNT_NUMBER_MAX: 24,
  MAX_ACCOUNT_BALANCE: 100000000,
  MAX_TX_AMOUNT: 10000000,
  TX_DESC_MIN: 2,
  TX_DESC_MAX: 200,
  LOAN_MIN_PRINCIPAL: 100,
  LOAN_MAX_PRINCIPAL: 10000000,
  LOAN_MIN_RATE: 1,
  LOAN_MAX_RATE: 35,
  LOAN_MIN_TERM: 3,
  LOAN_MAX_TERM: 360,
  LOAN_PURPOSE_MIN: 3,
  LOAN_PURPOSE_MAX: 200,
} as const;

export const ADMIN_BOOTSTRAP_EMAIL = 'sutharinithisha3@gmail.com';

export interface Branch {
  id: string;
  branchCode: string;
  name: string;
  city: string;
  state: string;
  address: string;
  routingCode: string;
  managerName: string;
  phone: string;
  status: BranchStatus;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Customer {
  id: string;
  uid: string;
  customerCode: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  dateOfBirth: string;
  branchId: string;
  kycStatus: KycStatus;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface BankAccount {
  id: string;
  accountNumber: string;
  customerId: string;
  uid: string;
  branchId: string;
  accountType: AccountType;
  balance: number;
  currency: 'USD';
  status: AccountStatus;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface BankTransaction {
  id: string;
  referenceCode: string;
  accountId: string;
  accountNumber: string;
  customerId: string;
  uid: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  status: TransactionStatus;
  createdAt?: Timestamp;
}

export interface Loan {
  id: string;
  loanCode: string;
  customerId: string;
  uid: string;
  accountId: string;
  branchId: string;
  loanType: LoanType;
  principalAmount: number;
  interestRate: number;
  termMonths: number;
  monthlyEmi: number;
  remainingBalance: number;
  purpose: string;
  status: LoanStatus;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
