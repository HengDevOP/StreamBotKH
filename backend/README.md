# StreamBotKH - Node.js Telegram Group Listener & Phrase Catcher Backend

This dedicated backend service connects to your Telegram group or channel, listens for incoming transaction alert messages and forwards from Cambodian banking apps, extracts donor amounts and messages, and triggers real-time OBS overlay broadcast alerts.

---

## 🚀 Key Features

1. **Automated Phrase Catcher Engine** (`backend/src/telegram/phraseCatcher.ts`):
   - **ABA Bank Mobile & PayWay SMS**: e.g., `Received $5.00 from SOKHA CHHIM (ABA Bank)...`
   - **NBC Bakong KHQR Push**: e.g., `Bakong KHQR Transfer: Received $25.00 from VANDY RATH...`
   - **ACLEDA Bank Mobile SMS**: e.g., `ACLEDA Bank: Received $15.00 from SOMNANG...`
   - **Wing Bank Notifications**: e.g., `Wing Bank: You received 40,000 KHR from CHANTHY...`
   - **Telegram Group Commands**: `/tip $10 [message]`, `!tip $5 from [name] [message]`

2. **Telegram Group Listener Service** (`backend/src/telegram/telegramListener.ts`):
   - Uses zero-latency Long Polling with Telegram Bot API.
   - Works locally, behind NAT/firewalls, or in Docker without needing public webhooks or tunnels.
   - Auto-detects all groups the bot is invited to.
   - Dispatches real-time WebSocket alerts to OBS overlays (`/overlay/[token]`).
   - Automatically records tips in the SQLite database ledger (`streamneon.db`).
   - Sends an optional confirmation receipt into the group.

3. **REST APIs & Test Simulator**:
   - `GET /api/telegram/status`: Check connection state and monitored groups.
   - `POST /api/telegram/start`: Start long polling with a bot token.
   - `POST /api/telegram/stop`: Stop long polling.
   - `POST /api/telegram/test-phrase`: Simulate any bank SMS or phrase and test live OBS overlay alerts.

---

## 🛠️ How to Run

### Run as part of the unified server:
```bash
npm run dev
```

### Or run standalone backend:
```bash
npm run backend
```
