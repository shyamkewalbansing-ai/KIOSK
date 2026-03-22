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
│   │   │   ├── CompanySettings.jsx  # Facturering, boetes, stempel
│   │   │   └── ...
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

## Wat is Geimplementeerd

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

### Kiosk Systeem (Voltooid)
- Welkomstscherm met bedrijfsnaam
- Appartement/huurder selectie
- Betalingsoverzicht en bevestiging
- Kwitantie (A4 ontwerp) met auto-redirect
- Huurmaand (rent_month) wordt automatisch bijgehouden

### Admin Dashboard (Voltooid)
- Dashboard met statistieken
- Huurder- en appartementbeheer (CRUD) - zonder Verdieping veld
- Betalingsgeschiedenis met kwitanties en maandfilter
- Instellingen pagina (facturering, boetes, handtekening)
- Tuya stroomonderbrekerpaneel (mock)

### Feature Batch - 22 mrt 2026 (Voltooid)
1. **Verdieping veld verwijderd** uit appartementformulier en model
2. **Huurmaand (rent_month)** automatisch bijgehouden bij betalingen
3. **Factureringsdag & boetes** configureerbaar per bedrijf (dag 1-28, vast boetebedrag)
4. **Handtekening/stempel upload** voor bedrijven (PNG/JPG/WEBP, max 5MB)
5. **Maandfilter** op betalingsgeschiedenis
6. **Bedrijfsinstellingen pagina** (/admin/settings)

## Openstaande Items

### P1 - Kwitantie Print Styling
- Print-preview toont niet dezelfde kleuren als schermweergave
- CSS fix toegepast maar niet geverifieerd

### P2 - Backend Saldo Berekening
- Mogelijke bug in balance check bij geautomatiseerde tests
- Handmatige tests lijken te werken

## Toekomstige Taken
- Tuya API integratie voor stroomonderbrekers
- SMS/WhatsApp herinneringen
- CSV/PDF export van betalingsrapporten
- Multi-building support per bedrijf
- E-mail notificaties voor verlopen abonnementen
