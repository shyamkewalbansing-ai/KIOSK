# Appartement Kiosk - Product Requirements Document

## Oorspronkelijke Probleemstelling
Zelfbedieningskiosk-systeem voor appartement huurbetalingen, primair voor de Surinaamse markt. Multi-tenant SaaS platform waar verschillende verhuurders hun eigen panden en huurders kunnen beheren.

## Kernvereisten
- **Huurder Kiosk**: Appartement selecteren, saldo bekijken, betalen (contant), kwitantie printen
- **Admin Dashboard**: Real-time overzicht van betalingen, huurders, appartementen
- **Multi-Tenant**: Elk bedrijf heeft eigen data, eigen kiosk-URL
- **Super Admin**: Abonnementsbeheer, facturatie, bedrijfsactivatie
- **Taal**: Nederlands (Nederlands)
- **Valuta**: Surinaamse Dollar (SRD)

## Architectuur
```
/app
├── backend/server.py          # FastAPI - alle routes, modellen, logica
├── frontend/src/
│   ├── App.js                 # Router
│   ├── context/AuthContext.jsx # Bedrijfsauthenticatie
│   ├── components/
│   │   ├── kiosk/             # Huurder-kiosk componenten
│   │   ├── admin/             # Admin dashboard componenten
│   │   ├── superadmin/        # Super admin portaal
│   │   └── shared/            # Gedeelde componenten (ReceiptTicket)
```

## Abonnementsmodel
- **Prijs**: SRD 3.500 per maand
- **Bank**: Hakrinbank, rekening 205911044, omschrijving 5978934982
- **Trial**: 3 dagen gratis
- **Grace period**: 3 dagen na verlopen
- **Auto-deactivering**: Na grace period
- **Super Admin kan**: Activeren (30d), Deactiveren, Gratis abonnement (geen vervaldatum)

## Inloggegevens
- **Super Admin**: admin@facturatie.sr / Bharat7755
- **Demo bedrijf**: demo@vastgoed.sr / demo123

## Wat is Geïmplementeerd

### Multi-Tenant Architectuur (Voltooid - 22 mrt 2026)
- Bedrijfsregistratie met e-mail/wachtwoord
- Bedrijfsauthenticatie met sessiecookies
- Alle data gekoppeld aan company_id
- Kiosk publieke routes: /api/kiosk/{company_id}/...
- Admin routes beschermd met bedrijfssessie
- Automatische data-isolatie tussen bedrijven

### Super Admin Portaal (Voltooid - 22 mrt 2026)
- Super admin login (vaste credentials)
- Overzicht tab: platformstatistieken + bankgegevens
- Bedrijven tab: bedrijfslijst met statusbadges + acties
- Facturen tab: factuurbeheer + betalingsregistratie
- Abonnementsstatus: trial/active/expired/deactivated/free
- Factuur genereren per bedrijf (SRD 3.500)
- Betaling registreren → abonnement auto-activeren (30 dagen)
- Gratis abonnement toekennen (geen vervaldatum)
- Auto-deactivering na grace period

### Kiosk Systeem (Eerder voltooid)
- Welkomstscherm met bedrijfsnaam
- Appartement/huurder selectie
- Betalingsoverzicht en bevestiging
- Kwitantie (A4 ontwerp) met auto-redirect
- Automatische facturering volgende maand

### Admin Dashboard (Eerder voltooid)
- Dashboard met statistieken
- Huurder- en appartementbeheer (CRUD)
- Betalingsgeschiedenis met kwitanties
- Tuya stroomonderbrekerpaneel (mock)

### Landing Page (Voltooid - 22 mrt 2026)
- SaaS marketing pagina op /
- Geen publieke bedrijfslijst
- Registreer/Inloggen knoppen

## Openstaande Items

### P1 - Kwitantie Print Styling
- Print-preview toont niet dezelfde kleuren als schermweergave
- CSS fix toegepast maar niet geverifieerd

### P2 - Export Rapporten
- CSV/PDF export van betalingsrapporten

## Toekomstige Taken
- Tuya API integratie voor stroomonderbrekers
- SMS/WhatsApp herinneringen
- Multi-building support per bedrijf
- Dark mode voor admin dashboard
