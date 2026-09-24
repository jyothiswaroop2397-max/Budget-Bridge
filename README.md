# Budget Bridge 💰

**Budget Bridge** is a personal finance tracker that lets you manually log expenses and income, 
track money owed between friends, and chat with an AI assistant to log transactions and ask 
questions about your spending — just by typing naturally (e.g. "Spent 250 on lunch" or 
"What's my monthly expenditure?").

## Features

- 📊 **Manual expense & income tracking** with categories (Food, Travel, Bills, Shopping, etc.)
- 🤖 **AI chat assistant** (powered by Gemini) that understands natural language to log 
  transactions, track peer debts, and answer budget questions
- 🤝 **Peer balance tracking** — keep track of who owes you and who you owe
- 📱 **Android companion** with automatic bank SMS detection to catch transactions you forget 
  to log manually
- 📅 Calendar view, analytics, and daily/monthly budget caps
- 🎨 Onboarding flow and theming support

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
- **Backend:** Express (Node.js)
- **AI:** Google Gemini (`@google/genai`)
- **Mobile:** Android (Kotlin) companion app for SMS-based auto-detection

## Getting Started

### Prerequisites
- Node.js 18+
- A [Gemini API key](https://aistudio.google.com/apikey)

### Setup

```bash
# install dependencies
npm install

# copy the env file and add your Gemini API key
cp .env.example .env

# run locally
npm run dev
```

The app will be available at `http://localhost:3000`.

### Environment Variables

| Variable          | Description                                  |
|-------------------|-----------------------------------------------|
| `GEMINI_API_KEY`  | Your Gemini API key, used for AI chat & parsing |
| `APP_URL`         | Base URL of the deployed app (optional)       |

## Deployment

This project can be deployed to:
- **Google AI Studio** (auto-configures `GEMINI_API_KEY`)
- **Vercel** — set `GEMINI_API_KEY` manually in Project Settings → Environment Variables
- **Render** — set `GEMINI_API_KEY` in the service's Environment tab

## Project Structure
