# ⚡ streambotkh.com (Next.js Full-Stack)

> **Next-Generation Unified Next.js Livestream Donation Alerts & Dashboard with ABA PayWay, Bakong KHQR, OBS Browser Overlay, and Telegram Bot Notifications.**

---

## 🌟 Highlights

- **⚡ Unified Full-Stack Next.js Architecture**:
  - **Framework**: Next.js 14 App Router, TypeScript, Tailwind CSS, Lucide icons, Canvas Confetti.
  - **Backend & Real-Time**: Integrated Next.js API Route Handlers, Custom Server (`server.ts`) with Socket.IO real-time event rooms, and high-performance SQLite (`better-sqlite3`).
- **🇰🇭 Cambodian Payment Integration (ABA PayWay & Bakong KHQR)**:
  - Dynamic EMVCo Tag-Length-Value (TLV) KHQR generator with CRC16 CCITT checksum.
  - Support for **Banking Name input** with quick chips for ABA Bank, ACLEDA, Canadia, Wing, Bakong, Sathapana, etc.
  - Instant Simulation / Sandbox Mode to test live alerts without real bank transactions.
- **🎬 Zero-Latency OBS Browser Source Overlay (`/overlay/:token`)**:
  - Transparent overlay designed for OBS Studio, Streamlabs, and vMix.
  - Animated Cyber card with glowing borders, GIF mascot reaction, particle confetti, and sender bank badge.
  - Web Audio synthesizer sound effects + Text-to-Speech (TTS) reading donor name & message.
  - Queued alert dispatcher ensuring rapid donations never step over each other.
- **📊 Streamer Command Deck (`/dashboard`)**:
  - Real-time earnings summary in both **USD ($)** and **Khmer Riel (៛)**.
  - Left sidebar navigation with plan fees: Free (10% fee), Pro $1.99/mo (0% fee), Studio $4.99/mo (0% fee).
  - Live Alert Box Studio: customize glow color, duration, sound effect, layout, and trigger instant test alerts.
  - Payment Gateways, Telegram Bot pairing, and OBS Browser Source configuration.
- **🌐 Dedicated Routes**:
  - `/` - Landing Page
  - `/@:username` or `/[username]` - Dedicated streamer donation portal with banking name input
  - `/donate/:username` - Alternative donation portal route
  - `/resources` - Documentation & setup guides
  - `/pricing` - Pricing plans (Free Starter, Pro Streamer, Studio)
  - `/discord` - Community hub
  - `/dashboard` - Streamer command deck
  - `/login` - Google OAuth & 1-Click Demo login
  - `/overlay/:token` - OBS transparent overlay

---

## 📁 Project Directory Structure

```text
StreamService/
├── src/
│   ├── app/                               # Next.js App Router
│   │   ├── layout.tsx                     # Root Layout with Auth & Socket providers
│   │   ├── page.tsx                       # Home Page (/)
│   │   ├── pricing/page.tsx               # Pricing Page (/pricing)
│   │   ├── resources/page.tsx             # Resources Page (/resources)
│   │   ├── discord/page.tsx               # Discord Page (/discord)
│   │   ├── dashboard/page.tsx             # Streamer Dashboard (/dashboard)
│   │   ├── login/page.tsx                 # Login Page (/login)
│   │   ├── [username]/page.tsx            # Streamer Donation Page (/@username)
│   │   ├── donate/[username]/page.tsx     # Streamer Donation Page (/donate/:username)
│   │   ├── overlay/[token]/page.tsx       # OBS Browser Source (/overlay/:token)
│   │   └── api/                           # Next.js Server Route Handlers
│   │       ├── auth/                      # Google login & demo login
│   │       ├── donations/                 # KHQR creation, status, and recent feeds
│   │       ├── payway/                    # PayWay webhook & instant simulator
│   │       └── streamer/                  # Stats, alert studio, and payment settings
│   ├── components/
│   │   ├── common/                        # Navbar, AppShell, Button, Card, Modal
│   │   ├── donate/                        # DonorForm, BakongKHQRModal, DonationSuccess
│   │   ├── dashboard/                     # Command deck tabs & stats
│   │   └── overlay/                       # OBS screen alert components
│   ├── views/                             # View components (HomePage, DashboardPage, etc.)
│   ├── context/                           # AuthContext, SocketContext
│   ├── hooks/                             # useAlertQueue, useAudio, useSpeechTTS
│   ├── server/                            # Server-side database, services & auth
│   │   ├── database/                      # better-sqlite3 connection & schema
│   │   ├── services/                      # Bakong KHQR, PayWay, Telegram, Socket.IO
│   │   ├── config/                        # Environment configuration
│   │   └── auth.ts                        # JWT authentication helper
│   ├── services/                          # Client API service fetchers
│   └── types/                             # Shared TypeScript types
├── server.ts                              # Custom Next.js + Socket.IO Server
├── next.config.mjs                        # Next.js Configuration
├── tailwind.config.ts                     # Tailwind CSS Configuration
└── package.json                           # Unified full-stack dependencies
```

---

## 🚀 Getting Started

### 1. Start the Dev Server
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser.

### 2. Build for Production
```bash
npm run build
npm start
```
