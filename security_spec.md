# Banking Management System — Security Specification (Phase 0)

## 1. Data Invariants

1. **Identity & Verification**: Every read/write across `CUSTOMERS`, `ACCOUNTS`, `Transactions`, `LOANS`, `BRANCHES`, and `admins` requires `request.auth != null && request.auth.token.email_verified == true`.
2. **PII Isolation (`CUSTOMERS`)**: Customer records contain PII (`email`, `phone`, `address`, `dateOfBirth`). A non-admin user may only read, query (`list`), create, or update the `CUSTOMERS` document where `uid == request.auth.uid` and `customerId == request.auth.uid` (on self-create).
3. **Referential Integrity**:
   - A `Customer` cannot be created without an existing `BRANCHES/{branchId}` document.
   - An `Account` cannot be created without existing `CUSTOMERS/{customerId}` and `BRANCHES/{branchId}` documents.
   - A `Loan` cannot be created without existing `CUSTOMERS/{customerId}`, `ACCOUNTS/{accountId}`, and `BRANCHES/{branchId}` documents.
4. **Account & Transaction Atomicity (`ACCOUNTS` + `Transactions`)**:
   - Customers can only open accounts with `balance == 0` and `status == 'active'`.
   - Every `Transactions` document creation MUST match the atomic post-commit `ACCOUNTS/{accountId}.balance` via `getAfter()` (`balanceAfter`), and `balanceAfter` must strictly equal `balanceBefore +/- amount` (within `0.005` float tolerance).
   - `Transactions` are immutable after creation (customers cannot update or delete; only admins may mark status `'reversed'`).
5. **Role Escalation & State Machine Protection**:
   - Customers cannot self-approve KYC (`kycStatus` must be `'pending'` on self-create; `kycStatus` cannot be changed by non-admins).
   - Customers cannot self-approve loans (`status` must be `'pending'` on create; customers can only reduce `remainingBalance` on `'active'` loans during repayment, and `'paid'` is only reachable when `remainingBalance == 0`).
   - Non-admins cannot write to `BRANCHES` or `admins`.
   - Closed accounts and rejected/paid loans are locked against further non-admin updates.

## 2. The "Dirty Dozen" Adversarial Payloads

| # | Target Collection | Attack Vector | Expected Result |
|---|-------------------|---------------|-----------------|
| 1 | `/CUSTOMERS/{uid}` | Unverified email (`email_verified: false`) attempting customer registration | `PERMISSION_DENIED` |
| 2 | `/CUSTOMERS/{uid}` | Self-registration setting `kycStatus: "verified"` instead of `"pending"` | `PERMISSION_DENIED` |
| 3 | `/CUSTOMERS/{otherUid}` | Non-admin customer reading or listing another customer's PII | `PERMISSION_DENIED` |
| 4 | `/CUSTOMERS/{uid}` | Shadow update injecting ghost field `isAdmin: true` or `role: "admin"` | `PERMISSION_DENIED` |
| 5 | `/ACCOUNTS/{accId}` | Customer creating an account with pre-funded `balance: 999999` | `PERMISSION_DENIED` |
| 6 | `/ACCOUNTS/{accId}` | Customer updating `balance` on a `'frozen'` or `'closed'` account | `PERMISSION_DENIED` |
| 7 | `/ACCOUNTS/{otherAccId}` | Customer mutating another user's account balance | `PERMISSION_DENIED` |
| 8 | `/Transactions/{txId}` | Creating a deposit `Transactions` log without atomically updating `ACCOUNTS.balance` | `PERMISSION_DENIED` |
| 9 | `/Transactions/{txId}` | Creating a transaction with manipulated math (`balanceAfter != balanceBefore + amount`) | `PERMISSION_DENIED` |
| 10 | `/Transactions/{txId}` | Customer deleting or updating an existing `Transactions` record | `PERMISSION_DENIED` |
| 11 | `/LOANS/{loanId}` | Customer creating a loan directly with `status: "active"` or modifying `principalAmount` | `PERMISSION_DENIED` |
| 12 | `/BRANCHES/{branchId}` | Non-admin user creating/updating a branch or writing to `/admins/{uid}` | `PERMISSION_DENIED` |
