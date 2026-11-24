import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import {
  ADMIN_BOOTSTRAP_EMAIL,
  BankAccount,
  BankTransaction,
  Branch,
  Customer,
  Loan,
} from '../types/banking';

export type PortalMode = 'admin' | 'customer';

interface BankAuthContextValue {
  user: User | null;
  authReady: boolean;
  isAdmin: boolean;
  portalMode: PortalMode;
  setPortalMode: (mode: PortalMode) => void;
  branches: Branch[];
  customers: Customer[];
  accounts: BankAccount[];
  transactions: BankTransaction[];
  loans: Loan[];
  currentCustomer: Customer | null;
  dataLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, password: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  logout: () => Promise<void>;
}

const BankAuthContext = createContext<BankAuthContextValue | null>(null);

function sortByCreatedAtDesc<T extends { createdAt?: { toMillis?: () => number } }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const tA = a.createdAt && typeof a.createdAt.toMillis === 'function' ? a.createdAt.toMillis() : 0;
    const tB = b.createdAt && typeof b.createdAt.toMillis === 'function' ? b.createdAt.toMillis() : 0;
    return tB - tA;
  });
}

export const BankAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [portalMode, setPortalMode] = useState<PortalMode>('customer');

  const [branches, setBranches] = useState<Branch[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser || !firebaseUser.emailVerified) {
        setIsAdmin(false);
        setPortalMode('customer');
        setBranches([]);
        setCustomers([]);
        setAccounts([]);
        setTransactions([]);
        setLoans([]);
        setAuthReady(true);
        return;
      }

      let adminFlag = firebaseUser.email === ADMIN_BOOTSTRAP_EMAIL;
      if (!adminFlag) {
        try {
          const adminDoc = await getDoc(doc(db, 'admins', firebaseUser.uid));
          adminFlag = adminDoc.exists();
        } catch {
          adminFlag = false;
        }
      }
      setIsAdmin(adminFlag);
      setPortalMode(adminFlag ? 'admin' : 'customer');
      setAuthReady(true);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !user || !user.emailVerified) {
      return;
    }

    setDataLoading(true);
    let pendingInitialLoads = 5;
    const markLoaded = () => {
      pendingInitialLoads -= 1;
      if (pendingInitialLoads <= 0) {
        setDataLoading(false);
      }
    };

    const branchesQuery = isAdmin
      ? collection(db, 'BRANCHES')
      : query(collection(db, 'BRANCHES'), where('status', '==', 'active'));

    const unsubBranches = onSnapshot(
      branchesQuery,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Branch));
        setBranches(sortByCreatedAtDesc(list));
        markLoaded();
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'BRANCHES')
    );

    const customersQuery = isAdmin
      ? collection(db, 'CUSTOMERS')
      : query(collection(db, 'CUSTOMERS'), where('uid', '==', user.uid));

    const unsubCustomers = onSnapshot(
      customersQuery,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Customer));
        setCustomers(sortByCreatedAtDesc(list));
        markLoaded();
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'CUSTOMERS')
    );

    const accountsQuery = isAdmin
      ? collection(db, 'ACCOUNTS')
      : query(collection(db, 'ACCOUNTS'), where('uid', '==', user.uid));

    const unsubAccounts = onSnapshot(
      accountsQuery,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as BankAccount));
        setAccounts(sortByCreatedAtDesc(list));
        markLoaded();
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'ACCOUNTS')
    );

    const txQuery = isAdmin
      ? collection(db, 'Transactions')
      : query(collection(db, 'Transactions'), where('uid', '==', user.uid));

    const unsubTransactions = onSnapshot(
      txQuery,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as BankTransaction));
        setTransactions(sortByCreatedAtDesc(list));
        markLoaded();
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'Transactions')
    );

    const loansQuery = isAdmin
      ? collection(db, 'LOANS')
      : query(collection(db, 'LOANS'), where('uid', '==', user.uid));

    const unsubLoans = onSnapshot(
      loansQuery,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Loan));
        setLoans(sortByCreatedAtDesc(list));
        markLoaded();
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'LOANS')
    );

    return () => {
      unsubBranches();
      unsubCustomers();
      unsubAccounts();
      unsubTransactions();
      unsubLoans();
    };
  }, [authReady, user, isAdmin]);

  const currentCustomer = useMemo(() => {
    if (!user) return null;
    return customers.find((c) => c.uid === user.uid) || null;
  }, [customers, user]);

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const registerWithEmail = async (name: string, email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (name.trim()) {
      await updateProfile(cred.user, { displayName: name.trim() });
    }
    await sendEmailVerification(cred.user);
  };

  const resendVerificationEmail = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <BankAuthContext.Provider
      value={{
        user,
        authReady,
        isAdmin,
        portalMode,
        setPortalMode,
        branches,
        customers,
        accounts,
        transactions,
        loans,
        currentCustomer,
        dataLoading,
        signInWithGoogle,
        signInWithEmail,
        registerWithEmail,
        resendVerificationEmail,
        logout,
      }}
    >
      {children}
    </BankAuthContext.Provider>
  );
};

export function useBankAuth(): BankAuthContextValue {
  const ctx = useContext(BankAuthContext);
  if (!ctx) {
    throw new Error('useBankAuth must be used inside BankAuthProvider');
  }
  return ctx;
}
