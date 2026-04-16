# TransportPlanner

Route planner voor een plantenbedrijf dat via vrachtwagens planten levert aan klanten in België, Nederland, Duitsland, Frankrijk en Italië. De applicatie integreert met SAP voor het ontvangen van orders en het terugsturen van gefinaliseerde ritten.

---

## Inhoudsopgave

- [Projectoverzicht](#projectoverzicht)
- [Technologiestack](#technologiestack)
- [Mappenstructuur](#mappenstructuur)
- [Datamodel](#datamodel)
- [SAP-adapter](#sap-adapter)
- [Workflow](#workflow)
- [Fasering](#fasering)
- [Openstaande vragen](#openstaande-vragen)

---

## Projectoverzicht

**Wat doet de applicatie?**

1. SAP stuurt een order (klantgegevens, leveradres, volume in karren, levertijd).
2. De order verschijnt als bolletje op een interactieve kaart.
3. Planners (meerdere tegelijk) slepen orders vanuit de kaart naar een voertuig.
4. Elk voertuig toont zijn beschikbare capaciteit (max. 40 karren).
5. Als een voertuig klaar is, wijst een planner een chauffeur toe.
6. Na definitieve bevestiging (geen wijzigingen meer mogelijk) wordt de route teruggestuurd naar SAP, die een leveringsblad aanmaakt.

**Belangrijke ontwerpprincipes:**

- Volledig open source — geen betaalde API's of licentiekosten.
- Modulair en uitbreidbaar — latere features (routeoptimalisatie, notificaties, ...) kunnen zonder grote refactoring toegevoegd worden.
- SAP-adapter geïsoleerd — het SAP-formaat is nog niet definitief bekend; de adapter is de enige plek die dat kent.
- Meerdere planners werken gelijktijdig — real-time synchronisatie via WebSockets.

---

## Technologiestack

### Frontend

| Laag | Technologie | Reden |
|---|---|---|
| Framework | React + TypeScript | Type-safe, industriestandaard |
| Build tool | Vite | Snel, moderne toolchain |
| Styling | Tailwind CSS + shadcn/ui | Professionele UI, consistente componenten |
| Kaart | Leaflet.js + react-leaflet | Open source, flexibel |
| Drag & drop | @dnd-kit/core | Modern, toegankelijk, performant |
| State | Zustand | Lichtgewicht, geen boilerplate |
| API-calls | TanStack Query | Caching, loading states, automatische refetch |
| Real-time | Socket.io client | Live updates tussen planners en bij nieuwe orders |

### Backend

| Laag | Technologie | Reden |
|---|---|---|
| Runtime | Node.js + TypeScript | Gedeelde types met frontend |
| Framework | Fastify | Snel, type-safe, productie-klaar |
| ORM | Prisma | Type-safe database access, migraties |
| Database | PostgreSQL | Relationeel, robuust voor business data |
| Auth | JWT + bcrypt | Standaard, stateless sessies |
| Real-time | Socket.io | Push events naar alle verbonden clients |
| Validatie | Zod | Runtime type checking op API-grenzen |

### Geocoding & Kaarten (100% open source)

| Functie | Technologie |
|---|---|
| Kaarttegels | OpenStreetMap (via Leaflet) |
| Geocoding (adres → coördinaten) | Nominatim (OpenStreetMap API) |
| Routeoptimalisatie (fase 6+) | OSRM (Open Source Routing Machine) |

### Infrastructuur

| Component | Keuze |
|---|---|
| Containerisatie | Docker + Docker Compose |
| Omgevingen | Development / Staging / Production |
| Reverse proxy | Nginx |

---

## Mappenstructuur

```
TransportPlanner/
├── packages/
│   ├── frontend/                   # React applicatie
│   │   └── src/
│   │       ├── components/
│   │       │   ├── map/            # Kaartcomponenten, order-bolletjes
│   │       │   ├── vehicles/       # Voertuigpaneel, drag-targets
│   │       │   ├── orders/         # Order detail modal, bewerken
│   │       │   ├── drivers/        # Chauffeur toewijzing
│   │       │   └── ui/             # Gedeelde UI (shadcn componenten)
│   │       ├── hooks/              # Custom React hooks
│   │       ├── stores/             # Zustand state stores
│   │       ├── services/           # API-calls (TanStack Query)
│   │       └── types/              # Lokale types (verwijzen naar shared)
│   │
│   ├── backend/                    # Fastify API
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── orders/         # CRUD, status, vergrendeling
│   │       │   ├── vehicles/       # Voertuigbeheer
│   │       │   ├── drivers/        # Chauffeurbeheer
│   │       │   ├── routes/         # Route planning (later uitbreidbaar)
│   │       │   └── auth/           # Login, gebruikersbeheer
│   │       ├── adapters/
│   │       │   └── sap/            # SAP adapter (volledig geïsoleerd)
│   │       ├── events/             # Socket.io event handlers
│   │       ├── middleware/         # Auth, logging, validatie
│   │       └── prisma/             # Schema + migraties
│   │
│   └── shared/                     # Gedeelde TypeScript types & Zod schemas
│       └── src/
│           ├── types/              # Order, Vehicle, Driver, User, ...
│           └── schemas/            # Zod schemas (gebruikt door frontend én backend)
│
├── docker-compose.yml              # Development omgeving
├── docker-compose.prod.yml         # Productie omgeving
├── .env.example                    # Voorbeeld omgevingsvariabelen
└── README.md                       # Dit bestand
```

---

## Datamodel

```
Order
  ├── id                  (uuid)
  ├── sapOrderId          Referentie naar SAP (uniek)
  ├── customerId          Klantnummer uit SAP
  ├── customerName
  ├── deliveryAddress     Volledig adres (string)
  ├── deliveryLat         Geocoded breedtegraad
  ├── deliveryLng         Geocoded lengtegraad
  ├── requestedDeliveryAt Gewenste leverdatum/-tijd
  ├── volumeKarren        Aantal karren voor deze bestelling
  ├── status              PENDING | ASSIGNED | LOCKED | SENT_TO_SAP
  ├── vehicleId?          Null als nog niet toegewezen
  ├── notes               Vrij tekstveld voor opmerkingen
  ├── sapRawPayload       Originele JSON van SAP (bewaard voor debugging)
  ├── createdAt
  └── updatedAt

Vehicle
  ├── id                  (uuid)
  ├── code                "01", "02", ... "10"
  ├── capacityKarren      Maximum (standaard 40)
  ├── isLocked            Geen wijzigingen meer mogelijk
  ├── driverId?           Null als nog geen chauffeur
  ├── plannedDate         Voor welke dag is dit voertuig gepland
  └── orders[]            Relatie naar Order

Driver
  ├── id                  (uuid)
  ├── name
  ├── licenseNumber
  └── isAvailable

User  (backoffice planner / admin)
  ├── id                  (uuid)
  ├── email
  ├── passwordHash
  ├── displayName
  └── role                ADMIN | PLANNER
```

---

## SAP-adapter

Omdat het SAP-formaat nog niet definitief bekend is, is de adapter volledig geïsoleerd van de rest van de applicatie.

```
backend/src/adapters/sap/
├── SapAdapter.interface.ts     Contract: wat verwacht de app van SAP
├── SapRestAdapter.ts           Implementatie voor REST (in te vullen zodra bekend)
├── SapMockAdapter.ts           Mock voor development en testing
└── index.ts                    Exporteert de actieve adapter (via .env config)
```

**Interface (contract):**

```typescript
interface SapAdapter {
  // Vertaalt het SAP-formaat naar het interne Order-formaat
  normalizeIncomingOrder(rawPayload: unknown): NormalizedOrder;

  // Bouwt de SAP-payload voor een gefinaliseerde rit
  buildOutgoingRoute(route: FinalizedRoute): unknown;

  // Bevestigt ontvangst van een order naar SAP
  acknowledgeOrder(sapOrderId: string): Promise<void>;
}
```

Zo kan later de `SapRestAdapter` worden ingevuld (of vervangen door een SOAP/XML variant) zonder één lijn in de rest van de applicatie te wijzigen.

---

## Workflow

```
1. SAP stuurt order (webhook of polling)
        ↓
   POST /api/sap/webhook
        ↓
   SapAdapter.normalizeIncomingOrder()
        ↓
   Order opgeslagen in DB  →  status: PENDING
        ↓
   Socket.io event → alle verbonden planners
        ↓
   Bolletje verschijnt op de kaart

2. Planner sleept bolletje naar voertuig
        ↓
   PATCH /api/orders/:id  { vehicleId }
        ↓
   Volume voertuig herberekend
        ↓
   Socket.io sync naar andere planners  →  status: ASSIGNED

3. Planner wijst chauffeur toe + vergrendelt voertuig
        ↓
   PATCH /api/vehicles/:id  { driverId, isLocked: true }
        ↓
   Orders in voertuig  →  status: LOCKED

4. Planner bevestigt definitief
        ↓
   POST /api/vehicles/:id/finalize
        ↓
   SapAdapter.buildOutgoingRoute()
        ↓
   Payload verstuurd naar SAP
        ↓
   SAP genereert leveringsblad
        ↓
   Orders  →  status: SENT_TO_SAP
```

---

## Fasering

### Fase 1 — Fundament ✅
- [x] Monorepo opzetten met pnpm workspaces
- [x] Docker Compose: PostgreSQL + backend + frontend
- [x] Prisma schema + eerste migratie
- [x] Authenticatie: login, JWT middleware, rollen
- [x] Shared types package opzetten

### Fase 2 — Kern backend
- [ ] Order CRUD endpoints
- [ ] Vehicle & Driver endpoints
- [ ] SAP Mock Adapter (testen zonder echte SAP)
- [ ] Socket.io: real-time push van events naar planners

### Fase 3 — Kaart & UI
- [ ] Leaflet kaart (BE/NL/DE/FR/IT)
- [ ] Order-bolletjes: klikbaar, detailmodal, bewerkbaar
- [ ] Geocoding via Nominatim (adres → coördinaten)

### Fase 4 — Planning workflow
- [ ] Voertuigpaneel (01 t/m N voertuigen)
- [ ] Drag & drop: orders vanuit kaart naar voertuig
- [ ] Volume tracking per voertuig (live)
- [ ] Chauffeur toewijzing
- [ ] Vergrendeling & definitieve bevestiging

### Fase 5 — SAP integratie
- [ ] Echte SAP adapter (zodra formaat bekend is)
- [ ] Webhook of polling mechanisme instellen
- [ ] Terugkoppeling naar SAP (leveringsblad trigger)

### Fase 6+ — Uitbreidingen
- [ ] Routeoptimalisatie via OSRM
- [ ] Historiek & rapportages
- [ ] E-mail notificaties
- [ ] Chauffeur-app (mobiel, optioneel)

---

## Opstarten (development)

### Vereisten
- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Docker Desktop

### Eerste keer

```bash
# 1. Kopieer de omgevingsvariabelen
cp .env.example .env

# 2. Installeer alle dependencies
pnpm install

# 3. Start de database
docker compose up db -d

# 4. Voer de database migraties uit en vul de seed data in
pnpm db:migrate
pnpm db:seed

# 5. Start backend + frontend
pnpm dev
```

De applicatie is bereikbaar op:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Prisma Studio** (DB browser): `pnpm db:studio`

### Standaard inloggegevens (seed)
| E-mail | Wachtwoord | Rol |
|---|---|---|
| admin@transportplanner.be | admin123! | ADMIN |

### Alles via Docker
```bash
docker compose up
```

---

## Openstaande vragen

| Vraag | Status | Antwoord |
|---|---|---|
| SAP communicatieformaat (REST/SOAP/XML/CSV)? | Open | Nog niet bekend |
| SAP richting: push (SAP belt ons) of pull (wij pollen)? | Open | Nog niet bekend |
| Hosting: lokale server of cloud? | Open | Nog niet bekend |
| Hoeveel planners tegelijk? | Beantwoord | Meerdere, werken naast elkaar |
| Geocoding: betaald of open source? | Beantwoord | Open source (Nominatim) |
| Routeoptimalisatie: betaald of open source? | Beantwoord | Open source (OSRM) |

---

*Laatste update: 2026-04-16*
