# Platform Operation Guide & Payout System Documentation

## 1. Multi-Account Management
The platform supports multiple trading accounts per user. Each account can have different types:
- **Evaluation:** Challenge accounts.
- **Funded:** Live trading accounts after passing evaluation.
- **Competition:** Monthly tournament accounts.

### Terminal Switching
In the **Trading Terminal (Node Environment)**, you can switch between accounts using the dropdown at the top right. If you have multiple accounts (e.g., a Free Demo and a Competition account), ensure you select the correct one to see your balance and trades.

## 2. Competition System
- **Registration:** When joining a competition, a new $100k account is automatically provisioned.
- **Notifications:** Users receive a real-time notification when their competition account is ready.
- **Access:** Competition accounts are visible in the **Terminals Hub** and **My Challenges** views.

## 3. Staggered Payout System (14-Day Vesting)
To ensure platform stability and professional trade management, we implement a staggered profit unlocking system for **Funded Accounts**.

### How it works:
1. **Profit Capture:** Every profitable trade closed on a funded account is converted into a "Payout Milestone".
2. **Vesting Period:** Profits are locked for 14 calendar days from the moment the trade is closed.
3. **Unlock:** After 14 days, the profit becomes "Available" in your Payout Wallet.
4. **Calculations:**
   - **Total Profit:** All profit earned on the account.
   - **Locked Amount:** Profits earned within the last 14 days.
   - **Matured Amount (Available):** Profits older than 14 days.
5. **Withdrawal:**
   - When you request a payout, the system calculates your **80% share** of the **Matured Amount**.
   - The withdrawn amount is deducted from your trading account balance and equity.
   - The remaining 20% stays in the platform as the house share.

## 4. MT5 Sync & Copy-Trading (Admin Only)
Administrators can configure individual copy-trading bridges for each user account.
- **Selective Copying:** Only accounts with MT5 Sync enabled will transmit trades to the broker destination.
- **Unique Destinations:** Each account can have its own `Bridge URL` and `Auth Token`, allowing you to put different users on different MT5 accounts.
- **Configuration:** Found in the Admin Panel -> Trader List -> Trader Overview -> MT5 Sync Section.

## 5. Troubleshooting
- **Balance 0:** If your terminal shows 0 balance, check the Account Dropdown to ensure you aren't on an old evaluation account that has been breached or is empty. Switch to your active Competition or Funded account.
- **Notifications:** Ensure you have accepted browser notification permissions and check the notification bell at the top right of the dashboard.
