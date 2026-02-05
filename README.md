# Rushingbot

Multi-tenant customer support bot for Go High Level (GHL), with cross-channel continuity (web chat, WhatsApp, email).

## Structure
- `apps/api`: Fastify API + webhooks + QR bridge
- `apps/admin`: Agent console (Next.js)
- `packages/shared`: Shared types

## Local dev
```
cp apps/api/.env.example apps/api/.env
npm install
npm -w apps/api run dev
npm -w apps/admin run dev
```

## Railway setup
Create two Railway services from the same repo:
1. Service `rushingbot-api`
   - Root directory: `apps/api`
   - Start command: `npm run start`
   - Build command: `npm run build`
2. Service `rushingbot-admin`
   - Root directory: `apps/admin`
   - Start command: `npm run start`
   - Build command: `npm run build`

## Webhooks
- `POST /webhooks/ghl` (GHL message events)
- `POST /api/whatsapp/qr` (generates QR + case code)

## Next steps
- Implement GHL send/receive logic
- Add bot inference (OpenAI) and knowledge base per location
- Add agent takeover/close controls in admin UI
