# Apartment Rent Payment Kiosk - PRD

## Problem Statement
Self-service kiosk system for apartment buildings in Suriname where tenants can pay rent, service costs, and fines via cash. Includes an admin dashboard for building managers with real-time payment tracking, tenant/apartment management, and mock Tuya breaker control.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI + Framer Motion
- **Backend**: FastAPI + Motor (async MongoDB)
- **Database**: MongoDB (collections: apartments, tenants, payments, users, user_sessions, breakers)
- **Auth**: Emergent Google OAuth (admin only)
- **Language**: Dutch (Nederlands)
- **Currency**: SRD (Suriname Dollar)

## User Personas
1. **Huurder (Tenant)**: Uses kiosk to pay rent, view outstanding balance, print receipt
2. **Beheerder (Manager/Owner)**: Uses admin dashboard to manage tenants, apartments, view payments, control breakers

## Core Requirements
- [x] Kiosk welcome screen with apartment selection
- [x] Tenant lookup by apartment number or tenant code
- [x] Financial overview (outstanding rent, service costs, fines)
- [x] Payment options (full rent, partial, service costs, fines)
- [x] Cash payment confirmation flow
- [x] Thermal-style receipt printing (window.print)
- [x] Admin Google Auth login
- [x] Admin dashboard with real-time stats
- [x] Tenant CRUD management
- [x] Apartment CRUD management
- [x] Payment history with search
- [x] Tuya breaker control panel (MOCK)
- [x] Demo seed data (6 apartments, 4 tenants, 6 breakers)

## What's Been Implemented (March 20, 2026)
### V1 MVP - Complete
- Full kiosk payment flow (welcome → select → overview → pay → confirm → receipt)
- Admin dashboard with 5 pages (dashboard, tenants, apartments, payments, breakers)
- Emergent Google OAuth for admin authentication
- Receipt printing with thermal printer styling
- Tuya breaker mock panel with toggle switches
- All backend APIs with proper MongoDB integration
- Responsive design with mobile support

### V1.1 - Kiosk Mode Redesign (March 20, 2026)
- Full-screen kiosk mode for ALL screens (like Albert Heijn self-checkout)
- Split-panel layouts with large touch-friendly buttons
- Modern tenant overview with 4 financial breakdown cards
- Modern payment confirm with split layout (amount left, confirm right)
- Auto-print receipt + auto-redirect to welcome screen
- Auto monthly rent billing (next month auto-added after full payment)
- Admin login button (gear icon) on kiosk welcome screen
- Admin dashboard redesigned to match kiosk style (horizontal tabs, large cards)
- On-screen keypad for tenant code entry

### V1.2 - Kwitantie Systeem (March 20, 2026)
- "Bon" volledig vervangen door "Kwitantie" door hele systeem
- Moderne A4 kwitantie met geometrische hoekvormen (blauw + oranje clipPath)
- Professionele tabel layout, oranje totaal balk, bedrijfsstempel
- Kwitantie-nummering KW- prefix, admin kwitantie-dialoog met print
- Countdown timer (8s) met auto-redirect op receipt scherm

## Prioritized Backlog
### P0 (Critical)
- None remaining for MVP

### P1 (High)
- Real Tuya API integration for breaker control
- Monthly rent auto-billing (scheduled job to add monthly rent to tenant balances)
- Export payment reports (CSV/PDF)

### P2 (Medium)
- SMS/WhatsApp payment reminders
- Multi-language support (English + Sranantongo)
- Tenant self-service portal (check balance online)
- Payment receipt email delivery

### P3 (Nice-to-have)
- QR code for tenant identification
- Digital payment integration (local bank transfer)
- Multi-building support
- Dark mode for admin dashboard
