# Security Specification: Prop Firm Dashboard

## 1. Data Invariants

1.  **User Ownership**: A user document at `/users/{userId}` can only be created by the user with the matching UID.
2.  **Notification Privacy**: Notifications at `/users/{userId}/notifications/{notifId}` are only readable by the owner or staff.
3.  **Trading Integrity**: Trading accounts at `/users/{userId}/tradingAccounts/{acctId}` can only be created by the owner or staff. Balance/equity updates are restricted to staff (to prevent self-funding).
4.  **Financial Immutability**: Transactions at `/transactions/{txId}` are immutable once completed. They can only be created by verified users for their own UID.
5.  **Audit Integrity**: Audit logs at `/auditLogs/{logId}` are create-only for staff and immutable.
6.  **Staff Privilege**: Only users with the `admin` or `moderator` role (verified via `/users/{userId}`) or those in the `/admins` collection can perform administrative actions.

## 2. The "Dirty Dozen" Payloads

### Payload 1: Identity Spoofing (Create user with different ID)
- **Path**: `/users/attacker_id`
- **Data**: `{ "id": "attacker_id", "name": "Fake Name", "email": "victim@example.com", "role": "trader", "createdAt": 123456789 }`
- **Auth**: `{ "uid": "differnt_uid" }`
- **Expected**: `PERMISSION_DENIED`

### Payload 2: Privilege Escalation (Self-assign Admin role)
- **Path**: `/users/user_id`
- **Data**: `{ "id": "user_id", "name": "User", "email": "user@example.com", "role": "admin", "createdAt": 123456789 }`
- **Auth**: `{ "uid": "user_id" }`
- **Expected**: `PERMISSION_DENIED` (during creation or update if role is changed)

### Payload 3: Orphaned Data (Create Trading Account for non-existent user)
- **Path**: `/users/non_existent/tradingAccounts/acc_1`
- **Data**: `{ "id": "acc_1", "userId": "non_existent", "accountNumber": "12345", "status": "active", "balance": 100000, "createdAt": 123456789 }`
- **Auth**: `{ "uid": "some_uid" }`
- **Expected**: `PERMISSION_DENIED`

### Payload 4: State Shortcutting (Update Transaction to Completed)
- **Path**: `/transactions/tx_1`
- **Data**: `{ "status": "completed" }`
- **Auth**: `{ "uid": "user_id" }` (owner but not admin)
- **Expected**: `PERMISSION_DENIED`

### Payload 5: Resource Poisoning (Large string in notification)
- **Path**: `/users/user_id/notifications/notif_1`
- **Data**: `{ "id": "notif_1", "userId": "user_id", "message": "A".repeat(10000), "read": false, "createdAt": 123456789 }`
- **Auth**: `{ "uid": "user_id" }`
- **Expected**: `PERMISSION_DENIED` (size limit)

### Payload 6: Shadow Update (Inject ghost field)
- **Path**: `/users/user_id`
- **Data**: `{ "isVerified": true }`
- **Auth**: `{ "uid": "user_id" }`
- **Expected**: `PERMISSION_DENIED` (hasOnly check)

### Payload 7: Email Spoofing (Unverified admin email)
- **Path**: `/packages/pkg_1` (delete)
- **Data**: `null`
- **Auth**: `{ "uid": "admin_uid", "token": { "email": "admin@prop.com", "email_verified": false } }`
- **Expected**: `PERMISSION_DENIED`

### Payload 8: PII Blanket Read (Scan all verification requests)
- **Path**: `/verificationRequests` (list)
- **Data**: `null`
- **Auth**: `{ "uid": "trader_uid" }`
- **Expected**: `PERMISSION_DENIED` (must filter by userId)

### Payload 9: Cross-User Notification Update
- **Path**: `/users/victim_id/notifications/notif_1`
- **Data**: `{ "read": true }`
- **Auth**: `{ "uid": "attacker_id" }`
- **Expected**: `PERMISSION_DENIED`

### Payload 10: Bot Profile Manipulation
- **Path**: `/botProfiles/aggressive`
- **Data**: `{ "buyProbability": 1.0 }`
- **Auth**: `{ "uid": "some_uid" }`
- **Expected**: `PERMISSION_DENIED` (Admin only)

### Payload 11: Immutable Field Update (Change createdAt)
- **Path**: `/users/user_id`
- **Data**: `{ "createdAt": 999999999 }`
- **Auth**: `{ "uid": "user_id" }`
- **Expected**: `PERMISSION_DENIED`

### Payload 12: Invalid Symbol Config
- **Path**: `/symbolConfigs/BTCUSD`
- **Data**: `{ "leverage": 1000 }`
- **Auth**: `{ "uid": "user_id" }`
- **Expected**: `PERMISSION_DENIED` (Admin only)
