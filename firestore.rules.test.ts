/**
 * Phase 0 Security Rules Verification Spec ("Dirty Dozen" Payloads)
 * Reference specification matching security_spec.md and firestore.rules.
 */

export interface DirtyDozenCase {
  id: number;
  collection: 'CUSTOMERS' | 'ACCOUNTS' | 'Transactions' | 'LOANS' | 'BRANCHES' | 'admins';
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  description: string;
  auth: { uid: string; email: string; email_verified: boolean } | null;
  payload: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_PAYLOADS: DirtyDozenCase[] = [
  {
    id: 1,
    collection: 'CUSTOMERS',
    operation: 'create',
    description: 'Unverified email attempting customer registration',
    auth: { uid: 'cust_1', email: 'cust1@example.com', email_verified: false },
    payload: { uid: 'cust_1', kycStatus: 'pending', fullName: 'Alice' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    collection: 'CUSTOMERS',
    operation: 'create',
    description: 'Self-registration attempting to set kycStatus to verified',
    auth: { uid: 'cust_1', email: 'cust1@example.com', email_verified: true },
    payload: { uid: 'cust_1', kycStatus: 'verified', fullName: 'Alice' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    collection: 'CUSTOMERS',
    operation: 'get',
    description: 'Non-admin customer reading another customer PII document',
    auth: { uid: 'cust_1', email: 'cust1@example.com', email_verified: true },
    payload: { targetDocId: 'cust_2' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    collection: 'CUSTOMERS',
    operation: 'update',
    description: 'Shadow update injecting ghost privilege field isAdmin: true',
    auth: { uid: 'cust_1', email: 'cust1@example.com', email_verified: true },
    payload: { fullName: 'Alice Updated', isAdmin: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    collection: 'ACCOUNTS',
    operation: 'create',
    description: 'Customer opening an account with pre-funded balance > 0',
    auth: { uid: 'cust_1', email: 'cust1@example.com', email_verified: true },
    payload: { uid: 'cust_1', balance: 999999, status: 'active' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    collection: 'ACCOUNTS',
    operation: 'update',
    description: 'Customer mutating balance on a frozen or closed account',
    auth: { uid: 'cust_1', email: 'cust1@example.com', email_verified: true },
    payload: { existingStatus: 'frozen', balance: 500 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    collection: 'ACCOUNTS',
    operation: 'update',
    description: 'Customer mutating another user bank account balance',
    auth: { uid: 'cust_1', email: 'cust1@example.com', email_verified: true },
    payload: { ownerUid: 'cust_2', balance: 0 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    collection: 'Transactions',
    operation: 'create',
    description: 'Creating a Transactions record without matching atomic ACCOUNTS balance update',
    auth: { uid: 'cust_1', email: 'cust1@example.com', email_verified: true },
    payload: { type: 'deposit', amount: 1000, balanceBefore: 0, balanceAfter: 1000 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    collection: 'Transactions',
    operation: 'create',
    description: 'Creating a Transactions record with forged balanceAfter arithmetic',
    auth: { uid: 'cust_1', email: 'cust1@example.com', email_verified: true },
    payload: { type: 'withdrawal', amount: 100, balanceBefore: 500, balanceAfter: 900 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    collection: 'Transactions',
    operation: 'delete',
    description: 'Customer attempting to delete an immutable financial ledger record',
    auth: { uid: 'cust_1', email: 'cust1@example.com', email_verified: true },
    payload: { targetDocId: 'tx_001' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    collection: 'LOANS',
    operation: 'create',
    description: 'Customer creating a loan application pre-marked as active',
    auth: { uid: 'cust_1', email: 'cust1@example.com', email_verified: true },
    payload: { uid: 'cust_1', status: 'active', principalAmount: 50000 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    collection: 'BRANCHES',
    operation: 'create',
    description: 'Non-admin user creating a branch or escalating into admins collection',
    auth: { uid: 'cust_1', email: 'cust1@example.com', email_verified: true },
    payload: { branchCode: 'BR-ROGUE', name: 'Rogue Branch' },
    expectedResult: 'PERMISSION_DENIED',
  },
];
