import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  AccountStatus,
  AccountType,
  BLUEPRINT_LIMITS,
  BranchStatus,
  KycStatus,
  LoanType,
} from '../types/banking';
import {
  calculateMonthlyEmi,
  generateAccountNumber,
  generateCustomerCode,
  generateLoanCode,
  generateReferenceCode,
  roundCents,
} from '../utils/format';

export class BusinessValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessValidationError';
  }
}

function assertLength(value: string, min: number, max: number, label: string): string {
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw new BusinessValidationError(`${label} must be between ${min} and ${max} characters.`);
  }
  return trimmed;
}

function assertPattern(value: string, pattern: RegExp, label: string): string {
  if (!pattern.test(value)) {
    throw new BusinessValidationError(`${label} contains invalid characters.`);
  }
  return value;
}

export async function seedDefaultBranches(): Promise<void> {
  const defaults = [
    {
      id: 'BR-NYC-001',
      branchCode: 'BR-NYC-001',
      name: 'Manhattan Headquarters',
      city: 'New York',
      state: 'NY',
      address: '200 Park Avenue, Suite 400, New York, NY 10166',
      routingCode: 'BLCRUS33NYC',
      managerName: 'Eleanor Vance',
      phone: '+1 (212) 555-0140',
      status: 'active' as BranchStatus,
    },
    {
      id: 'BR-SFO-002',
      branchCode: 'BR-SFO-002',
      name: 'San Francisco Bayfront',
      city: 'San Francisco',
      state: 'CA',
      address: '555 California Street, Floor 12, San Francisco, CA 94104',
      routingCode: 'BLCRUS33SFO',
      managerName: 'Marcus Chen',
      phone: '+1 (415) 555-0182',
      status: 'active' as BranchStatus,
    },
    {
      id: 'BR-CHI-003',
      branchCode: 'BR-CHI-003',
      name: 'Chicago Loop Financial Center',
      city: 'Chicago',
      state: 'IL',
      address: '155 N Wacker Drive, Chicago, IL 60606',
      routingCode: 'BLCRUS33CHI',
      managerName: 'Priya Nair',
      phone: '+1 (312) 555-0194',
      status: 'active' as BranchStatus,
    },
    {
      id: 'BR-AUS-004',
      branchCode: 'BR-AUS-004',
      name: 'Austin Congress Branch',
      city: 'Austin',
      state: 'TX',
      address: '301 Congress Avenue, Austin, TX 78701',
      routingCode: 'BLCRUS33AUS',
      managerName: 'David Morales',
      phone: '+1 (512) 555-0167',
      status: 'active' as BranchStatus,
    },
  ];

  const batch = writeBatch(db);
  for (const b of defaults) {
    const ref = doc(db, 'BRANCHES', b.id);
    batch.set(ref, {
      branchCode: b.branchCode,
      name: b.name,
      city: b.city,
      state: b.state,
      address: b.address,
      routingCode: b.routingCode,
      managerName: b.managerName,
      phone: b.phone,
      status: b.status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'BRANCHES');
  }
}

export async function createBranch(input: {
  branchCode: string;
  name: string;
  city: string;
  state: string;
  address: string;
  routingCode: string;
  managerName: string;
  phone: string;
  status: BranchStatus;
}): Promise<string> {
  const branchCode = assertPattern(
    assertLength(
      input.branchCode.toUpperCase(),
      BLUEPRINT_LIMITS.BRANCH_CODE_MIN,
      BLUEPRINT_LIMITS.BRANCH_CODE_MAX,
      'Branch Code'
    ),
    BLUEPRINT_LIMITS.CODE_PATTERN,
    'Branch Code'
  );
  const name = assertLength(input.name, 2, BLUEPRINT_LIMITS.BRANCH_NAME_MAX, 'Branch Name');
  const city = assertLength(input.city, 2, BLUEPRINT_LIMITS.CITY_MAX, 'City');
  const state = assertLength(input.state, 2, BLUEPRINT_LIMITS.STATE_MAX, 'State');
  const address = assertLength(input.address, 5, BLUEPRINT_LIMITS.BRANCH_ADDRESS_MAX, 'Address');
  const routingCode = assertPattern(
    assertLength(
      input.routingCode.toUpperCase(),
      BLUEPRINT_LIMITS.ROUTING_CODE_MIN,
      BLUEPRINT_LIMITS.ROUTING_CODE_MAX,
      'Routing Code'
    ),
    BLUEPRINT_LIMITS.CODE_PATTERN,
    'Routing Code'
  );
  const managerName = assertLength(
    input.managerName,
    2,
    BLUEPRINT_LIMITS.MANAGER_NAME_MAX,
    'Manager Name'
  );
  const phone = assertLength(
    input.phone,
    BLUEPRINT_LIMITS.PHONE_MIN,
    BLUEPRINT_LIMITS.PHONE_MAX,
    'Phone'
  );

  const docRef = doc(collection(db, 'BRANCHES'));
  try {
    await setDoc(docRef, {
      branchCode,
      name,
      city,
      state,
      address,
      routingCode,
      managerName,
      phone,
      status: input.status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `BRANCHES/${docRef.id}`);
  }
}

export async function updateBranch(
  branchId: string,
  input: {
    branchCode: string;
    name: string;
    city: string;
    state: string;
    address: string;
    routingCode: string;
    managerName: string;
    phone: string;
    status: BranchStatus;
  }
): Promise<void> {
  const branchCode = assertPattern(
    assertLength(
      input.branchCode.toUpperCase(),
      BLUEPRINT_LIMITS.BRANCH_CODE_MIN,
      BLUEPRINT_LIMITS.BRANCH_CODE_MAX,
      'Branch Code'
    ),
    BLUEPRINT_LIMITS.CODE_PATTERN,
    'Branch Code'
  );
  const name = assertLength(input.name, 2, BLUEPRINT_LIMITS.BRANCH_NAME_MAX, 'Branch Name');
  const city = assertLength(input.city, 2, BLUEPRINT_LIMITS.CITY_MAX, 'City');
  const state = assertLength(input.state, 2, BLUEPRINT_LIMITS.STATE_MAX, 'State');
  const address = assertLength(input.address, 5, BLUEPRINT_LIMITS.BRANCH_ADDRESS_MAX, 'Address');
  const routingCode = assertPattern(
    assertLength(
      input.routingCode.toUpperCase(),
      BLUEPRINT_LIMITS.ROUTING_CODE_MIN,
      BLUEPRINT_LIMITS.ROUTING_CODE_MAX,
      'Routing Code'
    ),
    BLUEPRINT_LIMITS.CODE_PATTERN,
    'Routing Code'
  );
  const managerName = assertLength(
    input.managerName,
    2,
    BLUEPRINT_LIMITS.MANAGER_NAME_MAX,
    'Manager Name'
  );
  const phone = assertLength(
    input.phone,
    BLUEPRINT_LIMITS.PHONE_MIN,
    BLUEPRINT_LIMITS.PHONE_MAX,
    'Phone'
  );

  try {
    await updateDoc(doc(db, 'BRANCHES', branchId), {
      branchCode,
      name,
      city,
      state,
      address,
      routingCode,
      managerName,
      phone,
      status: input.status,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `BRANCHES/${branchId}`);
  }
}

export async function registerCustomerSelf(input: {
  uid: string;
  email: string;
  fullName: string;
  phone: string;
  address: string;
  dateOfBirth: string;
  branchId: string;
}): Promise<string> {
  const fullName = assertLength(
    input.fullName,
    BLUEPRINT_LIMITS.FULL_NAME_MIN,
    BLUEPRINT_LIMITS.FULL_NAME_MAX,
    'Full Name'
  );
  const email = assertLength(input.email, 5, BLUEPRINT_LIMITS.EMAIL_MAX, 'Email');
  const phone = assertLength(
    input.phone,
    BLUEPRINT_LIMITS.PHONE_MIN,
    BLUEPRINT_LIMITS.PHONE_MAX,
    'Phone Number'
  );
  const address = assertLength(
    input.address,
    BLUEPRINT_LIMITS.CUSTOMER_ADDRESS_MIN,
    BLUEPRINT_LIMITS.CUSTOMER_ADDRESS_MAX,
    'Residential Address'
  );
  const dateOfBirth = assertPattern(
    assertLength(input.dateOfBirth, 8, 20, 'Date of Birth'),
    BLUEPRINT_LIMITS.DOB_PATTERN,
    'Date of Birth'
  );
  const branchId = assertPattern(input.branchId, BLUEPRINT_LIMITS.ID_PATTERN, 'Branch');

  const customerRef = doc(db, 'CUSTOMERS', input.uid);
  try {
    await setDoc(customerRef, {
      uid: input.uid,
      customerCode: generateCustomerCode(),
      fullName,
      email,
      phone,
      address,
      dateOfBirth,
      branchId,
      kycStatus: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return customerRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `CUSTOMERS/${input.uid}`);
  }
}

export async function adminCreateCustomer(input: {
  uid?: string;
  email: string;
  fullName: string;
  phone: string;
  address: string;
  dateOfBirth: string;
  branchId: string;
  kycStatus: KycStatus;
}): Promise<string> {
  const fullName = assertLength(
    input.fullName,
    BLUEPRINT_LIMITS.FULL_NAME_MIN,
    BLUEPRINT_LIMITS.FULL_NAME_MAX,
    'Full Name'
  );
  const email = assertLength(input.email, 5, BLUEPRINT_LIMITS.EMAIL_MAX, 'Email');
  const phone = assertLength(
    input.phone,
    BLUEPRINT_LIMITS.PHONE_MIN,
    BLUEPRINT_LIMITS.PHONE_MAX,
    'Phone Number'
  );
  const address = assertLength(
    input.address,
    BLUEPRINT_LIMITS.CUSTOMER_ADDRESS_MIN,
    BLUEPRINT_LIMITS.CUSTOMER_ADDRESS_MAX,
    'Residential Address'
  );
  const dateOfBirth = assertPattern(
    assertLength(input.dateOfBirth, 8, 20, 'Date of Birth'),
    BLUEPRINT_LIMITS.DOB_PATTERN,
    'Date of Birth'
  );
  const branchId = assertPattern(input.branchId, BLUEPRINT_LIMITS.ID_PATTERN, 'Branch');

  const docRef = doc(collection(db, 'CUSTOMERS'));
  const uid = input.uid && BLUEPRINT_LIMITS.ID_PATTERN.test(input.uid.trim())
    ? input.uid.trim()
    : docRef.id;

  try {
    await setDoc(docRef, {
      uid,
      customerCode: generateCustomerCode(),
      fullName,
      email,
      phone,
      address,
      dateOfBirth,
      branchId,
      kycStatus: input.kycStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `CUSTOMERS/${docRef.id}`);
  }
}

export async function updateCustomerProfile(
  customerId: string,
  updates: {
    fullName: string;
    phone: string;
    address: string;
    branchId: string;
    email?: string;
    dateOfBirth?: string;
    kycStatus?: KycStatus;
  },
  isAdminMode: boolean
): Promise<void> {
  const fullName = assertLength(
    updates.fullName,
    BLUEPRINT_LIMITS.FULL_NAME_MIN,
    BLUEPRINT_LIMITS.FULL_NAME_MAX,
    'Full Name'
  );
  const phone = assertLength(
    updates.phone,
    BLUEPRINT_LIMITS.PHONE_MIN,
    BLUEPRINT_LIMITS.PHONE_MAX,
    'Phone Number'
  );
  const address = assertLength(
    updates.address,
    BLUEPRINT_LIMITS.CUSTOMER_ADDRESS_MIN,
    BLUEPRINT_LIMITS.CUSTOMER_ADDRESS_MAX,
    'Residential Address'
  );
  const branchId = assertPattern(updates.branchId, BLUEPRINT_LIMITS.ID_PATTERN, 'Branch');

  const payload: Record<string, unknown> = {
    fullName,
    phone,
    address,
    branchId,
    updatedAt: serverTimestamp(),
  };

  if (isAdminMode) {
    if (updates.email) {
      payload.email = assertLength(updates.email, 5, BLUEPRINT_LIMITS.EMAIL_MAX, 'Email');
    }
    if (updates.dateOfBirth) {
      payload.dateOfBirth = assertPattern(
        assertLength(updates.dateOfBirth, 8, 20, 'Date of Birth'),
        BLUEPRINT_LIMITS.DOB_PATTERN,
        'Date of Birth'
      );
    }
    if (updates.kycStatus) {
      payload.kycStatus = updates.kycStatus;
    }
  }

  try {
    await updateDoc(doc(db, 'CUSTOMERS', customerId), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `CUSTOMERS/${customerId}`);
  }
}

export async function openBankAccount(input: {
  customerId: string;
  uid: string;
  branchId: string;
  accountType: AccountType;
  initialDeposit?: number;
}): Promise<string> {
  const branchId = assertPattern(input.branchId, BLUEPRINT_LIMITS.ID_PATTERN, 'Branch');
  const customerId = assertPattern(input.customerId, BLUEPRINT_LIMITS.ID_PATTERN, 'Customer');
  const uid = assertPattern(input.uid, BLUEPRINT_LIMITS.ID_PATTERN, 'User ID');

  const accountRef = doc(collection(db, 'ACCOUNTS'));
  const accountNumber = generateAccountNumber();

  try {
    await setDoc(accountRef, {
      accountNumber,
      customerId,
      uid,
      branchId,
      accountType: input.accountType,
      balance: 0,
      currency: 'USD',
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `ACCOUNTS/${accountRef.id}`);
  }

  const openingDeposit = roundCents(input.initialDeposit || 0);
  if (openingDeposit > 0) {
    await executeSimulatedTransaction({
      accountId: accountRef.id,
      type: 'deposit',
      amount: openingDeposit,
      description: `Opening deposit for ${input.accountType} account`,
    });
  }

  return accountRef.id;
}

export async function adminUpdateAccount(
  accountId: string,
  updates: {
    status: AccountStatus;
    branchId: string;
    accountType: AccountType;
  }
): Promise<void> {
  const branchId = assertPattern(updates.branchId, BLUEPRINT_LIMITS.ID_PATTERN, 'Branch');
  try {
    await updateDoc(doc(db, 'ACCOUNTS', accountId), {
      status: updates.status,
      branchId,
      accountType: updates.accountType,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `ACCOUNTS/${accountId}`);
  }
}

export async function executeSimulatedTransaction(input: {
  accountId: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  description: string;
}): Promise<string> {
  const amount = roundCents(input.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > BLUEPRINT_LIMITS.MAX_TX_AMOUNT) {
    throw new BusinessValidationError(
      `Amount must be greater than $0.00 and at most $${BLUEPRINT_LIMITS.MAX_TX_AMOUNT.toLocaleString()}.`
    );
  }
  const description = assertLength(
    input.description,
    BLUEPRINT_LIMITS.TX_DESC_MIN,
    BLUEPRINT_LIMITS.TX_DESC_MAX,
    'Transaction Memo'
  );

  const accountRef = doc(db, 'ACCOUNTS', input.accountId);
  const txRef = doc(collection(db, 'Transactions'));
  const referenceCode = generateReferenceCode('TXN');

  try {
    await runTransaction(db, async (tx) => {
      const accSnap = await tx.get(accountRef);
      if (!accSnap.exists()) {
        throw new BusinessValidationError('Selected bank account does not exist.');
      }
      const accData = accSnap.data();
      if (accData.status !== 'active') {
        throw new BusinessValidationError(
          `Cannot process transactions on a ${accData.status} account.`
        );
      }

      const balanceBefore = roundCents(Number(accData.balance));
      let balanceAfter = balanceBefore;

      if (input.type === 'deposit') {
        balanceAfter = roundCents(balanceBefore + amount);
        if (balanceAfter > BLUEPRINT_LIMITS.MAX_ACCOUNT_BALANCE) {
          throw new BusinessValidationError(
            `Deposit exceeds maximum simulated account limit of $${BLUEPRINT_LIMITS.MAX_ACCOUNT_BALANCE.toLocaleString()}.`
          );
        }
      } else {
        if (amount > balanceBefore) {
          throw new BusinessValidationError(
            `Insufficient available balance ($${balanceBefore.toFixed(2)}) for this withdrawal.`
          );
        }
        balanceAfter = roundCents(balanceBefore - amount);
      }

      tx.update(accountRef, {
        balance: balanceAfter,
        updatedAt: serverTimestamp(),
      });

      tx.set(txRef, {
        referenceCode,
        accountId: accountRef.id,
        accountNumber: accData.accountNumber,
        customerId: accData.customerId,
        uid: accData.uid,
        type: input.type,
        amount,
        balanceBefore,
        balanceAfter,
        description,
        status: 'completed',
        createdAt: serverTimestamp(),
      });
    });

    return referenceCode;
  } catch (err) {
    if (err instanceof BusinessValidationError) {
      throw err;
    }
    handleFirestoreError(err, OperationType.WRITE, `ACCOUNTS/${input.accountId}`);
  }
}

export async function executeInternalTransfer(input: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description: string;
}): Promise<string> {
  if (input.fromAccountId === input.toAccountId) {
    throw new BusinessValidationError('Source and destination accounts must be different.');
  }
  const amount = roundCents(input.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > BLUEPRINT_LIMITS.MAX_TX_AMOUNT) {
    throw new BusinessValidationError(
      `Transfer amount must be greater than $0.00 and at most $${BLUEPRINT_LIMITS.MAX_TX_AMOUNT.toLocaleString()}.`
    );
  }
  const description = assertLength(
    input.description,
    BLUEPRINT_LIMITS.TX_DESC_MIN,
    BLUEPRINT_LIMITS.TX_DESC_MAX,
    'Transfer Memo'
  );

  const fromRef = doc(db, 'ACCOUNTS', input.fromAccountId);
  const toRef = doc(db, 'ACCOUNTS', input.toAccountId);
  const outTxRef = doc(collection(db, 'Transactions'));
  const inTxRef = doc(collection(db, 'Transactions'));
  const referenceCode = generateReferenceCode('TRF');

  try {
    await runTransaction(db, async (tx) => {
      const [fromSnap, toSnap] = await Promise.all([tx.get(fromRef), tx.get(toRef)]);
      if (!fromSnap.exists() || !toSnap.exists()) {
        throw new BusinessValidationError('Both source and destination accounts must exist.');
      }

      const fromData = fromSnap.data();
      const toData = toSnap.data();

      if (fromData.status !== 'active' || toData.status !== 'active') {
        throw new BusinessValidationError('Both accounts must be active to complete a transfer.');
      }

      const fromBefore = roundCents(Number(fromData.balance));
      const toBefore = roundCents(Number(toData.balance));

      if (amount > fromBefore) {
        throw new BusinessValidationError(
          `Insufficient balance ($${fromBefore.toFixed(2)}) in source account.`
        );
      }

      const fromAfter = roundCents(fromBefore - amount);
      const toAfter = roundCents(toBefore + amount);

      if (toAfter > BLUEPRINT_LIMITS.MAX_ACCOUNT_BALANCE) {
        throw new BusinessValidationError('Transfer exceeds destination account maximum balance.');
      }

      tx.update(fromRef, { balance: fromAfter, updatedAt: serverTimestamp() });
      tx.update(toRef, { balance: toAfter, updatedAt: serverTimestamp() });

      tx.set(outTxRef, {
        referenceCode: `${referenceCode}-OUT`,
        accountId: fromRef.id,
        accountNumber: fromData.accountNumber,
        customerId: fromData.customerId,
        uid: fromData.uid,
        type: 'transfer_out',
        amount,
        balanceBefore: fromBefore,
        balanceAfter: fromAfter,
        description: `${description} (To ${toData.accountNumber})`.slice(
          0,
          BLUEPRINT_LIMITS.TX_DESC_MAX
        ),
        status: 'completed',
        createdAt: serverTimestamp(),
      });

      tx.set(inTxRef, {
        referenceCode: `${referenceCode}-IN`,
        accountId: toRef.id,
        accountNumber: toData.accountNumber,
        customerId: toData.customerId,
        uid: toData.uid,
        type: 'transfer_in',
        amount,
        balanceBefore: toBefore,
        balanceAfter: toAfter,
        description: `${description} (From ${fromData.accountNumber})`.slice(
          0,
          BLUEPRINT_LIMITS.TX_DESC_MAX
        ),
        status: 'completed',
        createdAt: serverTimestamp(),
      });
    });

    return referenceCode;
  } catch (err) {
    if (err instanceof BusinessValidationError) {
      throw err;
    }
    handleFirestoreError(err, OperationType.WRITE, `ACCOUNTS/${input.fromAccountId}`);
  }
}

export async function applyForLoan(input: {
  customerId: string;
  uid: string;
  accountId: string;
  branchId: string;
  loanType: LoanType;
  principalAmount: number;
  interestRate: number;
  termMonths: number;
  purpose: string;
}): Promise<string> {
  const principalAmount = roundCents(input.principalAmount);
  if (
    !Number.isFinite(principalAmount) ||
    principalAmount < BLUEPRINT_LIMITS.LOAN_MIN_PRINCIPAL ||
    principalAmount > BLUEPRINT_LIMITS.LOAN_MAX_PRINCIPAL
  ) {
    throw new BusinessValidationError(
      `Loan principal must be between $${BLUEPRINT_LIMITS.LOAN_MIN_PRINCIPAL} and $${BLUEPRINT_LIMITS.LOAN_MAX_PRINCIPAL.toLocaleString()}.`
    );
  }
  const interestRate = roundCents(input.interestRate);
  if (
    !Number.isFinite(interestRate) ||
    interestRate < BLUEPRINT_LIMITS.LOAN_MIN_RATE ||
    interestRate > BLUEPRINT_LIMITS.LOAN_MAX_RATE
  ) {
    throw new BusinessValidationError(
      `Interest rate must be between ${BLUEPRINT_LIMITS.LOAN_MIN_RATE}% and ${BLUEPRINT_LIMITS.LOAN_MAX_RATE}%.`
    );
  }
  const termMonths = Math.round(input.termMonths);
  if (
    !Number.isFinite(termMonths) ||
    termMonths < BLUEPRINT_LIMITS.LOAN_MIN_TERM ||
    termMonths > BLUEPRINT_LIMITS.LOAN_MAX_TERM
  ) {
    throw new BusinessValidationError(
      `Loan term must be between ${BLUEPRINT_LIMITS.LOAN_MIN_TERM} and ${BLUEPRINT_LIMITS.LOAN_MAX_TERM} months.`
    );
  }
  const purpose = assertLength(
    input.purpose,
    BLUEPRINT_LIMITS.LOAN_PURPOSE_MIN,
    BLUEPRINT_LIMITS.LOAN_PURPOSE_MAX,
    'Loan Purpose'
  );

  const monthlyEmi = calculateMonthlyEmi(principalAmount, interestRate, termMonths);
  const loanRef = doc(collection(db, 'LOANS'));
  const loanCode = generateLoanCode();

  try {
    await setDoc(loanRef, {
      loanCode,
      customerId: input.customerId,
      uid: input.uid,
      accountId: input.accountId,
      branchId: input.branchId,
      loanType: input.loanType,
      principalAmount,
      interestRate,
      termMonths,
      monthlyEmi,
      remainingBalance: principalAmount,
      purpose,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return loanCode;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `LOANS/${loanRef.id}`);
  }
}

export async function adminProcessLoan(
  loanId: string,
  decision: 'approve' | 'reject'
): Promise<void> {
  const loanRef = doc(db, 'LOANS', loanId);

  if (decision === 'reject') {
    try {
      await updateDoc(loanRef, {
        status: 'rejected',
        updatedAt: serverTimestamp(),
      });
      return;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `LOANS/${loanId}`);
    }
  }

  const txRef = doc(collection(db, 'Transactions'));
  const referenceCode = generateReferenceCode('DISB');

  try {
    await runTransaction(db, async (tx) => {
      const loanSnap = await tx.get(loanRef);
      if (!loanSnap.exists()) {
        throw new BusinessValidationError('Loan application not found.');
      }
      const loan = loanSnap.data();
      if (loan.status !== 'pending') {
        throw new BusinessValidationError(`Loan is already ${loan.status}.`);
      }

      const accRef = doc(db, 'ACCOUNTS', loan.accountId);
      const accSnap = await tx.get(accRef);
      if (!accSnap.exists()) {
        throw new BusinessValidationError('Linked disbursement account does not exist.');
      }
      const acc = accSnap.data();
      if (acc.status !== 'active') {
        throw new BusinessValidationError(
          `Linked account ${acc.accountNumber} is ${acc.status}; cannot disburse funds.`
        );
      }

      const amount = roundCents(Number(loan.principalAmount));
      const balanceBefore = roundCents(Number(acc.balance));
      const balanceAfter = roundCents(balanceBefore + amount);

      tx.update(loanRef, {
        status: 'active',
        updatedAt: serverTimestamp(),
      });

      tx.update(accRef, {
        balance: balanceAfter,
        updatedAt: serverTimestamp(),
      });

      tx.set(txRef, {
        referenceCode,
        accountId: accRef.id,
        accountNumber: acc.accountNumber,
        customerId: loan.customerId,
        uid: loan.uid,
        type: 'loan_disbursement',
        amount,
        balanceBefore,
        balanceAfter,
        description: `Simulated loan disbursement (${loan.loanCode})`,
        status: 'completed',
        createdAt: serverTimestamp(),
      });
    });
  } catch (err) {
    if (err instanceof BusinessValidationError) {
      throw err;
    }
    handleFirestoreError(err, OperationType.WRITE, `LOANS/${loanId}`);
  }
}

export async function repayLoan(loanId: string, rawAmount: number): Promise<string> {
  const repayAmount = roundCents(rawAmount);
  if (!Number.isFinite(repayAmount) || repayAmount <= 0) {
    throw new BusinessValidationError('Repayment amount must be greater than $0.00.');
  }

  const loanRef = doc(db, 'LOANS', loanId);
  const txRef = doc(collection(db, 'Transactions'));
  const referenceCode = generateReferenceCode('RPMT');

  try {
    await runTransaction(db, async (tx) => {
      const loanSnap = await tx.get(loanRef);
      if (!loanSnap.exists()) {
        throw new BusinessValidationError('Loan record not found.');
      }
      const loan = loanSnap.data();
      if (loan.status !== 'active') {
        throw new BusinessValidationError('Only active loans can receive repayments.');
      }

      const remainingBefore = roundCents(Number(loan.remainingBalance));
      if (repayAmount > remainingBefore) {
        throw new BusinessValidationError(
          `Repayment exceeds remaining loan balance ($${remainingBefore.toFixed(2)}).`
        );
      }

      const accRef = doc(db, 'ACCOUNTS', loan.accountId);
      const accSnap = await tx.get(accRef);
      if (!accSnap.exists()) {
        throw new BusinessValidationError('Linked repayment account not found.');
      }
      const acc = accSnap.data();
      if (acc.status !== 'active') {
        throw new BusinessValidationError(`Linked account ${acc.accountNumber} is ${acc.status}.`);
      }

      const balanceBefore = roundCents(Number(acc.balance));
      if (repayAmount > balanceBefore) {
        throw new BusinessValidationError(
          `Insufficient balance ($${balanceBefore.toFixed(2)}) in linked account ${acc.accountNumber}.`
        );
      }

      const balanceAfter = roundCents(balanceBefore - repayAmount);
      const remainingAfter = roundCents(remainingBefore - repayAmount);
      const nextStatus = remainingAfter === 0 ? 'paid' : 'active';

      tx.update(accRef, {
        balance: balanceAfter,
        updatedAt: serverTimestamp(),
      });

      tx.update(loanRef, {
        remainingBalance: remainingAfter,
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });

      tx.set(txRef, {
        referenceCode,
        accountId: accRef.id,
        accountNumber: acc.accountNumber,
        customerId: loan.customerId,
        uid: loan.uid,
        type: 'loan_repayment',
        amount: repayAmount,
        balanceBefore,
        balanceAfter,
        description: `Simulated loan repayment (${loan.loanCode})`,
        status: 'completed',
        createdAt: serverTimestamp(),
      });
    });

    return referenceCode;
  } catch (err) {
    if (err instanceof BusinessValidationError) {
      throw err;
    }
    handleFirestoreError(err, OperationType.WRITE, `LOANS/${loanId}`);
  }
}
