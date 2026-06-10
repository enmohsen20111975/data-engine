# 📊 Data Engine - بورصة البيانات
## Stock Market Data Engine for Middle East Markets

---

## 🌟 Overview

A comprehensive data engine for collecting, processing, and analyzing stock market data from Middle Eastern markets including:
- 🇸🇦 **Saudi Arabia (Tadawul)**
- 🇪🇬 **Egypt (EGX)**
- 🇰🇼 **Kuwait (KSE)**
- 🇶🇦 **Qatar (QSE)**

---

## ✨ Features

### 1. 📈 Stock Database
- Comprehensive stock information for Middle Eastern markets
- Historical data storage and retrieval
- Performance metrics and analytics

### 2. 📰 News Aggregation
- Market news collection from multiple sources
- News categorization by market and sector
- Real-time updates

### 3. 🤖 AI Analysis Engine
- Technical analysis (30%)
- Fundamental analysis (25%)
- Quantitative analysis (15%)
- Sentiment analysis (30%)
- Personalized recommendations based on investor personality

### 4. 📱 Telegram Integration
- **Channel Discovery**: Automatic detection of Telegram channels
- **Market Classification**: Auto-categorize channels by market (Saudi/Egypt/Kuwait/Qatar)
- **Content Classification**: Identify channel type (Stocks/Crypto/News/General)
- **Message Scraping**: Pull messages with date range selection (7-90 days)
- **AI Processing**: Extract trading signals and news from messages

---

## 🏗️ Architecture

```
my-project/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main UI (5 Tabs)
│   │   └── api/
│   │       ├── stocks/           # Stock data API
│   │       ├── news/             # News API
│   │       ├── analyze/          # AI Analysis API
│   │       ├── db-stats/         # Database stats
│   │       ├── database-report/  # Database report
│   │       ├── auto-refresh/     # Auto refresh status
│   │       └── telegram/         # Telegram APIs
│   │           ├── auth/         # Authentication
│   │           ├── channels/     # Channel listing
│   │           ├── messages/     # Message storage
│   │           ├── scrape/       # Scraping endpoint
│   │           └── process/      # AI processing
│   └── components/ui/            # shadcn/ui components
├── mini-services/
│   └── telegram-service/         # Telegram Service (Port 3010)
│       ├── index.js              # Node.js Express server
│       ├── telegram_script.py    # Python Telethon script
│       ├── credentials.json      # Telegram API credentials
│       └── session.session       # Auth session
├── prisma/
│   └── schema.prisma             # Database schema
├── db/
│   └── custom.db                 # SQLite database
├── worklog.md                    # Project work log
├── .env.text                     # Environment variables (template)
└── README.md                     # This file
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- Bun package manager

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/enmohsen20111975/data-engine.git
cd data-engine
```

2. **Install dependencies**
```bash
bun install
```

3. **Install Python dependencies**
```bash
pip install telethon
```

4. **Set up environment variables**
```bash
cp .env.text .env
# Edit .env with your values
```

5. **Initialize database**
```bash
bun run db:push
```

6. **Start the development server**
```bash
bun run dev
```

7. **Start Telegram service** (in another terminal)
```bash
cd mini-services/telegram-service
bun run dev
```

---

## 📱 Telegram Integration

### Setup Telegram API

1. Go to [my.telegram.org](https://my.telegram.org)
2. Create a new application
3. Get your `api_id` and `api_hash`
4. Update `mini-services/telegram-service/credentials.json`:
```json
{
  "api_id": YOUR_API_ID,
  "api_hash": "YOUR_API_HASH"
}
```

### Authentication Flow

1. Open the web interface
2. Go to "تيليجرام" tab
3. Enter your phone number (with country code)
4. Enter the verification code sent to Telegram
5. If 2FA is enabled, enter your password

### Channel Features

| Feature | Description |
|---------|-------------|
| **List Channels** | View all your Telegram channels and groups |
| **Market Filter** | Filter by Saudi/Egypt/Kuwait/Qatar |
| **Type Filter** | Filter by Stocks/Crypto/News/General |
| **Date Range** | Select 7/14/30/60/90 days |
| **Message Limit** | Set max messages per channel |
| **AI Processing** | Extract signals and news |

---

## 🗄️ Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `stocks` | Stock information |
| `news` | Market news |
| `telegram_messages` | Raw Telegram messages |
| `telegram_signals` | Trading signals extracted |
| `telegram_news` | News extracted from messages |

---

## 🎯 API Endpoints

### Stocks
- `GET /api/stocks` - List stocks with pagination
- `GET /api/stock-detail?symbol=X` - Get stock details

### News
- `GET /api/news` - List news with pagination

### Analysis
- `GET /api/analyze?action=market&personality=balanced` - Run market analysis

### Telegram
- `GET /api/telegram/auth/status` - Check auth status
- `POST /api/telegram/auth/start` - Start authentication
- `POST /api/telegram/auth/verify` - Verify code
- `POST /api/telegram/auth/password` - Verify 2FA password
- `GET /api/telegram/channels` - List channels
- `POST /api/telegram/scrape` - Scrape messages
- `POST /api/telegram/messages` - Save messages
- `POST /api/telegram/process` - Process with AI

---

## 🔧 Environment Variables

See `.env.text` for all required environment variables.

---

## 📊 Investor Personalities

| Personality | Buy Threshold | Risk Level |
|-------------|---------------|------------|
| Conservative | 60% | Low |
| Moderate | 55% | Low-Medium |
| Balanced | 50% | Medium |
| Growth | 45% | Medium-High |
| Aggressive | 40% | High |
| Speculative | 35% | Very High |
| Gambler | 30% | Extreme |

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: SQLite
- **Telegram**: Node.js + Telethon (Python)
- **AI**: Custom analysis engine

---

## 📝 License

MIT License

---

## 👤 Author

Mohsen - [GitHub](https://github.com/enmohsen20111975)

---

## 📅 Last Updated

January 14, 2025
