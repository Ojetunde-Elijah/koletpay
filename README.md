# KoletPay

- `backend/`  Express + MongoDB API (auth, KoletPay virtual wallet, invoices, payment links, Gemini assistant)
- `frontend/` Next.js app

## Run locally
```
cd backend  && npm install && npm start      # needs MongoDB running; edit backend/.env
cd frontend && npm install && npm run dev    # http://localhost:3000
```

## How it works
- **Register / login** with Nigerian business details. Every business gets a KoletPay virtual account number and wallet.
- **Create invoice** page: either set a price + create a **payment link** (no customer needed), or invoice an existing customer and optionally attach a link.
- **Customer pay page** `/pay/<token>`: customer enters name, phone, WhatsApp, address, then pays. Details are saved as a customer, the invoice is created/updated, and the amount is credited to the business wallet.
- **Wallet**: balance, activity, withdraw to a Nigerian bank account.
- **Kolet AI**: Gemini via the backend (key never reaches the browser). Falls back to a basic parser if Gemini is unreachable.

## Payments are SIMULATED
`PAYMENTS_MODE=simulated` marks payments successful instantly and moves no real money. Going live needs a licensed
payment provider (checkout + signed webhook) wired into `backend/src/services/settlement.js` (`confirmWithGateway`)
and a payout provider for withdrawals.

## Deploy on Render
Backend env vars: `MONGO_URI`, `JWT_SECRET` (long random), `CLIENT_ORIGINS` (your frontend URL), `PAYMENTS_MODE`,
`GEMINI_API_KEY`, `GEMINI_MODEL`. Frontend env var: `NEXT_PUBLIC_API_URL` (backend URL).

## Security note
The Gemini key was pasted in a chat. Rotate it in Google AI Studio, then put the new key only in `backend/.env` / Render.
`backend/.env` is git-ignored; never commit it.
