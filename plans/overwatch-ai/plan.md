# Overwatch AI — Autonomous Personal Emergency Planner (Philippines)

**Branch:** `feat/overwatch-ai-mvp`
**Description:** Build a multi-agent AI emergency preparedness assistant tailored for the Philippines that generates personalized crisis plans using real-time disaster data, evacuation routing to nearby government facilities, supply checklists, and communication templates.

## Goal

Overwatch AI is an agentic AI-powered emergency preparedness assistant for Filipinos living in disaster-prone areas. The Philippines faces typhoons, earthquakes, volcanic eruptions, flooding, and landslides regularly. By analyzing a user's location and real-time risk data through a multi-agent system (risk assessment, supplies planning, evacuation routing, communication drafting), it generates tailored, dynamic crisis plans — replacing static emergency guides with a proactive, intelligent safety companion.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 7 + Tailwind CSS 4 (already configured) |
| Scraping Backend | Node.js + Express + Playwright (headless Chromium) — `server/` directory |
| Maps | Leaflet + react-leaflet (Geoapify Map Tiles) |
| LLM | Google Gemini 2.5 Flash (free tier: 500 RPD, 1M tokens/day) |
| Weather (API) | Open-Meteo API (free, no key, covers Philippines) |
| Weather (Scraped) | PAGASA — typhoon bulletins, flood advisories, daily forecasts |
| Earthquakes (API) | USGS Earthquake API (free, PH bounding box filter) |
| Earthquakes (Scraped) | PHIVOLCS — PH-specific earthquake bulletins with PHIVOLCS intensity |
| Volcanoes (Scraped) | PHIVOLCS — volcanic alert levels (Mayon, Taal, Kanlaon, etc.) |
| Disaster Events | NASA EONET + GDACS + ReliefWeb (free, PH filters) |
| Nearby Facilities | Geoapify Places API (hospitals, schools, fire stations, police) |
| Geocoding | Geoapify Geocoding API (`countrycode:ph` filter) |
| Routing | Geoapify Routing API (drive, walk modes) |
| Icons | lucide-react |
| State | React Context API |
| Navigation | react-router-dom |

## Free APIs & Data Sources (All No-Cost, Philippines-Compatible)

### APIs (Direct JSON Access)

| API | Purpose | Auth | Rate Limit |
|-----|---------|------|------------|
| **Open-Meteo** | Weather forecasts, typhoon tracking, flood data | None | Unlimited (non-commercial) |
| **USGS Earthquake** | Earthquakes in PH region (bbox: 4.5°N–21°N, 116°E–127°E) | None | Unlimited |
| **NASA EONET v3** | Active natural events (typhoons, volcanoes, wildfires) | None | Unlimited |
| **GDACS** | Global disaster alerts filtered to Philippines | None | Unlimited |
| **ReliefWeb** | NDRRMC disaster reports, situation updates | None | 1,000/day |
| **Geoapify Places** | Query nearby hospitals, schools, fire stations, police stations, evacuation centers | API key (free tier) | 3,000/day |
| **Geoapify Geocoding** | Geocoding + autocomplete for Philippine addresses (cities, barangays, municipalities) | API key (free tier) | 3,000/day |
| **Geoapify Routing** | Driving/walking route calculations across Philippine roads | API key (free tier) | 3,000/day |
| **Geoapify Map Tiles** | Styled map tile rendering via Leaflet | API key (free tier) | Fair use |
| **Google Gemini** | AI agent reasoning & content generation | API key (free tier) | 500 RPD / 1M tokens/day |

### Scraped Sources (via Playwright Backend)

These Philippine government websites have **no public APIs** but contain critical PH-specific data. A local Node.js/Express backend uses **Playwright** (headless Chromium) to scrape these sites, parse the HTML, and return clean JSON to the React frontend via proxied API routes.

| Source | URL | Data Scraped | Update Freq |
|--------|-----|-------------|-------------|
| **PHIVOLCS Earthquakes** | `earthquake.phivolcs.dost.gov.ph` | Latest PH earthquakes with PHIVOLCS Intensity Scale (I–X), depth, location | Multiple times/hour |
| **PHIVOLCS Volcanoes** | `wovodat.phivolcs.dost.gov.ph/bulletin/list-of-bulletin` | Active volcano bulletins — alert levels (0–5), SO2 flux, seismicity for Mayon, Taal, Kanlaon, etc. | Daily |
| **PAGASA Weather** | `pubfiles.pagasa.dost.gov.ph/tamss/weather/` | Daily weather forecasts, tropical cyclone bulletins, `cyclone.dat` tracking data | Multiple times/day |
| **PAGASA Flood** | `bagong.pagasa.dost.gov.ph/flood` | River basin flood watch status, dam water levels | Multiple times/day |

### Why Scrape?

The scraped data provides unique Philippine-specific context that international APIs don't have:
- **PHIVOLCS Intensity Scale** (I–X) — different from global magnitude; measures local felt intensity
- **Volcano Alert Levels** (0–5) — official PH volcanic status (e.g., Taal at Alert 1, Kanlaon at Alert 2)
- **PAGASA Typhoon Names** — Philippines uses its own typhoon naming system
- **River Basin Flood Watch** — localized dam/river data not in Open-Meteo

### Scraping Architecture

```
┌── React Frontend (Vite, port 5173) ──┐     ┌── Express Backend (port 3001) ──────────┐
│                                       │     │                                         │
│  src/api/pagasa.js ───────────────────┼────►│  GET /api/scrape/pagasa/weather          │──► pagasa.dost.gov.ph
│  src/api/phivolcs.js ─────────────────┼────►│  GET /api/scrape/phivolcs/earthquakes    │──► earthquake.phivolcs.dost.gov.ph
│                                       │     │  GET /api/scrape/phivolcs/volcanoes      │──► wovodat.phivolcs.dost.gov.ph
│                                       │     │  GET /api/scrape/pagasa/flood            │──► bagong.pagasa.dost.gov.ph
│  (Vite dev proxy: /api/scrape →       │     │                                         │
│   http://localhost:3001)              │     │  Uses Playwright (headless Chromium) to: │
│                                       │     │  1. Launch browser → navigate to page    │
│                                       │     │  2. Extract DOM data via page.$$eval()   │
│                                       │     │  3. Return clean JSON                    │
│                                       │     │                                         │
│                                       │     │  ┌─ 15-min in-memory cache ────────────┐ │
│                                       │     │  │ Map<url, {data, expiry}> per route   │ │
│                                       │     │  │ Avoids hammering PH gov sites        │ │
│                                       │     │  └─────────────────────────────────────┘ │
└───────────────────────────────────────┘     └─────────────────────────────────────────┘
```

**Why Playwright over Cloudflare Worker?** Playwright provides full browser rendering (can handle JS-heavy pages), proper DOM access via `page.$$eval()`, and runs in a standard Node.js environment. Trade-off: requires a running Node.js server alongside Vite in development.

## Architecture

```
┌──────────────────── React Frontend ────────────────────┐
│                                                         │
│  ┌─────────────┐    ┌──────────────────────────────┐   │
│  │  Dashboard   │    │   Agent Orchestrator         │   │
│  │  Components  │◄──►│   (AppContext + useAgents)   │   │
│  └─────────────┘    └──────────┬───────────────────┘   │
│                                │                        │
│         ┌──────────┬──────────┬──────────┐             │
│         ▼          ▼          ▼          ▼             │
│   ┌──────────┐┌──────────┐┌──────────┐┌──────────┐   │
│   │  Risk    ││ Supplies ││Evacuation││  Comms   │   │
│   │Assessment││ Planning ││ Routing  ││ Drafting │   │
│   │  Agent   ││  Agent   ││  Agent   ││  Agent   │   │
│   └────┬─────┘└────┬─────┘└────┬─────┘└────┬─────┘   │
│        │           │           │           │          │
│        ▼           ▼           ▼           ▼          │
│   Open-Meteo   Gemini API  Geoapify    Gemini API    │
│   USGS API     (analysis)  Places API  (drafting)    │
│   NASA EONET               Geoapify                  │
│   GDACS                    Routing API               │
│   ReliefWeb                Leaflet Map               │
│   ┌─ Scraped via Playwright Backend ─┐               │
│   │ PAGASA (weather, flood, typhoon)  │               │
│   │ PHIVOLCS (earthquakes, volcanoes) │               │
│   └───────────────────────────────────┘               │
│   Gemini API                                         │
└─────────────────────────────────────────────────────────┘
          │ (Vite dev proxy: /api/scrape → :3001)
          ▼
┌─── Express + Playwright Backend (port 3001) ───────────┐
│  server/index.js                                        │
│  ├─ GET /api/scrape/phivolcs/earthquakes                │
│  ├─ GET /api/scrape/phivolcs/volcanoes                  │
│  ├─ GET /api/scrape/pagasa/weather                      │
│  └─ GET /api/scrape/pagasa/flood                        │
│                                                         │
│  Playwright launches headless Chromium → navigates →    │
│  extracts DOM data → returns JSON. 15-min TTL cache.    │
└─────────────────────────────────────────────────────────┘
```

### Agent Details

| Agent | Data Sources | Output |
|-------|-------------|--------|
| **Risk Assessment** | Open-Meteo (typhoon/weather), USGS (earthquakes), NASA EONET (volcanoes/storms), GDACS (alerts), ReliefWeb (PH reports), **PAGASA** (scraped: typhoon bulletins, flood watch), **PHIVOLCS** (scraped: PH earthquakes with intensity, volcano alerts) → Gemini analysis | Risk level, active threats, historical patterns, PH-specific warnings with PHIVOLCS intensity & PAGASA advisories |
| **Supplies Planning** | Risk Assessment output → Gemini generation | Prioritized checklist by disaster type (typhoon kit vs earthquake kit vs flood kit), locally available items |
| **Evacuation Routing** | Geoapify Places API (nearby hospitals, schools, fire stations, police) + Geoapify Routing API (drive/walk routes) → Gemini recommendations | Nearest facilities by type, driving/walking routes, disaster-specific shelter recommendations |
| **Communication Drafting** | Risk Assessment output + user location → Gemini generation | Emergency SMS templates (Filipino/English), family meeting plan, barangay contact info, NDRRMC hotline reference |

### Geoapify Places API — Facility Queries (Key Feature)

The app queries Geoapify Places API to find nearby government facilities for evacuation based on the disaster type:

| Disaster Type | Recommended Facilities | Geoapify Categories |
|---------------|----------------------|---------------------|
| **Typhoon** | Schools (evacuation centers), Government Buildings | `education.school`, `office.government` |
| **Earthquake** | Open spaces, Hospitals | `healthcare.hospital`, `leisure.park` |
| **Flood** | Schools on high ground, Fire Stations | `education.school`, `service.fire_station` |
| **Volcanic Eruption** | Schools (far from volcano), Hospitals | `education.school`, `healthcare.hospital` |
| **All disasters** | Police Stations, Fire Stations, Hospitals | `service.police`, `service.fire_station`, `healthcare.hospital` |

**API Call Pattern:**
```
GET https://api.geoapify.com/v2/places
  ?categories=healthcare.hospital,education.school
  &filter=circle:{lon},{lat},{radiusMeters}
  &limit=20
  &apiKey={GEOAPIFY_API_KEY}
```

## Folder Structure

```
server/                          # Playwright scraping backend
├── package.json                 # express, cors, playwright
├── index.js                     # Express server entry (port 3001)
├── cache.js                     # Simple TTL cache (15-min default)
└── scrapers/
    ├── phivolcsEarthquakes.js   # Scrapes earthquake.phivolcs.dost.gov.ph
    ├── phivolcsVolcanoes.js     # Scrapes wovodat.phivolcs.dost.gov.ph
    ├── pagasaWeather.js         # Scrapes pagasa weather + pubfiles
    └── pagasaFlood.js           # Scrapes bagong.pagasa.dost.gov.ph/flood

src/
├── agents/                      # AI agent modules
│   ├── orchestrator.js          # Coordinates all agents
│   ├── riskAssessment.js        # Risk Assessment Agent
│   ├── suppliesPlanning.js      # Supplies Planning Agent
│   ├── evacuationRouting.js     # Evacuation Routing Agent
│   └── communicationDraft.js    # Communication Drafting Agent
├── api/                         # API client wrappers
│   ├── weather.js               # Open-Meteo weather & typhoon data
│   ├── disasters.js             # USGS, NASA EONET, GDACS, ReliefWeb
│   ├── pagasa.js                # PAGASA scraped data (via Playwright backend)
│   ├── phivolcs.js              # PHIVOLCS scraped data (via Playwright backend)
│   ├── geoapify.js              # Geoapify: geocoding, autocomplete, routing, places
│   └── gemini.js                # Google Gemini LLM client
├── components/                  # React UI components
│   ├── layout/
│   │   ├── Header.jsx           # App header/navbar
│   │   └── Layout.jsx           # Main layout wrapper
│   ├── landing/
│   │   └── LandingPage.jsx      # Landing/hero page
│   ├── onboarding/
│   │   └── LocationInput.jsx    # Location input + geolocation
│   ├── dashboard/
│   │   ├── Dashboard.jsx        # Main dashboard container
│   │   ├── AgentStatusBar.jsx   # Agent processing status indicators
│   │   ├── RiskPanel.jsx        # Risk assessment results
│   │   ├── SuppliesPanel.jsx    # Supply checklist display
│   │   ├── EvacuationPanel.jsx  # Evacuation routes + facility map
│   │   ├── CommsPanel.jsx       # Communication plan display
│   │   └── Map.jsx              # Leaflet map component (Geoapify tiles)
│   └── common/
│       ├── LoadingSpinner.jsx   # Loading indicator
│       └── Card.jsx             # Reusable card component
├── context/
│   └── AppContext.jsx           # Global app state
├── hooks/
│   └── useAgents.js             # Agent orchestration hook
├── utils/
│   ├── prompts.js               # Prompt templates for each agent
│   └── constants.js             # App constants, PH defaults, emergency hotlines
├── App.jsx
├── App.css
├── main.jsx
└── index.css
```

---

## Implementation Steps

### Step 1: Project Foundation & Core Infrastructure
**Files:** `package.json`, `.env.example`, `.gitignore`, `vite.config.js`, `src/api/gemini.js`, `src/api/weather.js`, `src/api/disasters.js`, `src/api/geoapify.js`, `src/utils/constants.js`, `src/context/AppContext.jsx`
**What:** Install all frontend dependencies (`react-router-dom`, `react-leaflet`, `leaflet`, `lucide-react`). Create `.env.example` with `VITE_GEMINI_API_KEY`, `GEOAPIFY_API_KEY`, and `SCRAPER_URL=http://localhost:3001` placeholders. Update `vite.config.js` to add a dev proxy: `/api/scrape` → `http://localhost:3001`. Build all API client modules:
- `weather.js` — Open-Meteo forecast + weather codes for Philippine coordinates
- `disasters.js` — USGS earthquakes (PH bounding box: 4.5–21°N, 116–127°E), NASA EONET events, GDACS alerts, ReliefWeb PH disaster reports
- `geoapify.js` — **Single module replacing the original `geocoding.js`, `routing.js`, and `facilities.js`**. Uses `GEOAPIFY_API_KEY` (called directly from browser). Functions:
  - `geocodeSearch(text)` — `GET https://api.geoapify.com/v1/geocode/search?text=...&filter=countrycode:ph`
  - `geocodeAutocomplete(text)` — `GET https://api.geoapify.com/v1/geocode/autocomplete?text=...&filter=countrycode:ph`
  - `reverseGeocode(lat, lon)` — `GET https://api.geoapify.com/v1/geocode/reverse?lat=...&lon=...`
  - `getRoute(from, to, mode)` — `GET https://api.geoapify.com/v1/routing?waypoints=lat1,lon1|lat2,lon2&mode=drive|walk`
  - `findNearbyFacilities(lat, lon, categories, radius)` — `GET https://api.geoapify.com/v2/places?categories=...&filter=circle:lon,lat,radius`
- `gemini.js` — Google Gemini 2.5 Flash client with structured JSON output

Create the global `AppContext` for state management (user location, disaster type, agent results, loading states). Define `constants.js` with PH emergency hotlines (NDRRMC: 911, Red Cross: 143, Fire: 160, PNP: 117), Philippine bounding box, disaster type enums, Geoapify tile URL template.
**Testing:** Run `npm run dev` — app compiles. Manually test each API module in browser console to confirm real data returns from Open-Meteo, USGS, and Geoapify Places for a Manila coordinate (14.5995, 120.9842).

### Step 2: Playwright Scraping Backend (PAGASA & PHIVOLCS)
**Files:** `server/package.json`, `server/index.js`, `server/cache.js`, `server/scrapers/phivolcsEarthquakes.js`, `server/scrapers/phivolcsVolcanoes.js`, `server/scrapers/pagasaWeather.js`, `server/scrapers/pagasaFlood.js`, `src/api/pagasa.js`, `src/api/phivolcs.js`
**What:** Build an Express/Node.js backend in the `server/` directory that uses **Playwright** (headless Chromium) to scrape Philippine government websites and return clean JSON. The server runs on port 3001 with CORS enabled for `localhost:5173`.

**Backend setup:**
- `server/package.json` — dependencies: `express`, `cors`, `playwright`
- `server/index.js` — Express entry point, registers 4 scrape routes under `/api/scrape/*`
- `server/cache.js` — simple TTL `Map<key, { data, expiry }>` with 15-minute default TTL
- Scripts: `"start": "node index.js"`, `"dev": "node --watch index.js"`

**Scrapers (each uses Playwright’s `chromium.launch()` → `page.goto()` → `page.$$eval()` pattern):**

1. **`GET /api/scrape/phivolcs/earthquakes`** — `server/scrapers/phivolcsEarthquakes.js`
   - Navigates to `https://earthquake.phivolcs.dost.gov.ph`
   - Extracts all rows from the earthquake HTML table via `page.$$eval('table tr', ...)`
   - Returns: `[{ datetime, latitude, longitude, depth, magnitude, phivolcsIntensity, location }]`
   - PHIVOLCS Intensity Scale (I–X) is unique to the Philippines and not available from USGS

2. **`GET /api/scrape/phivolcs/volcanoes`** — `server/scrapers/phivolcsVolcanoes.js`
   - Navigates to `https://wovodat.phivolcs.dost.gov.ph/bulletin/list-of-bulletin`
   - Extracts volcano bulletin listings from the page DOM
   - Returns: `[{ volcano, alertLevel, alertDescription, date, so2Flux, seismicEvents }]`
   - Alert levels 0–5 (0=Normal, 1=Low-level unrest, ... 5=Hazardous eruption)

3. **`GET /api/scrape/pagasa/weather`** — `server/scrapers/pagasaWeather.js`
   - Navigates to `https://bagong.pagasa.dost.gov.ph/weather` for the daily synopsis
   - Also fetches `https://pubfiles.pagasa.dost.gov.ph/tamss/weather/` directory to check for active `cyclone.dat` and `metafile.txt`
   - Returns: `{ synopsis, activeTyphoons, forecasts }`
   - Includes PAGASA typhoon names (local PH naming system)

4. **`GET /api/scrape/pagasa/flood`** — `server/scrapers/pagasaFlood.js`
   - Navigates to `https://bagong.pagasa.dost.gov.ph/flood`
   - Extracts river basin flood watch table and dam water level table from the page DOM
   - Returns: `{ riverBasins: [{ name, status }], dams: [{ name, waterLevel, spillwayLevel }] }`

**Caching:** Each Express route checks the TTL cache before invoking Playwright. Cache hit returns stored JSON instantly. Cache miss launches the scraper, stores results for 15 min, then returns JSON.
**CORS:** Express middleware returns `Access-Control-Allow-Origin` for the Vite dev origin.

On the frontend, build `src/api/pagasa.js` and `src/api/phivolcs.js` as API clients that call the scraper URL (configured via `SCRAPER_URL` env var, proxied through `vite.config.js` in dev).

**Testing:** Run `cd server && npm install && npx playwright install chromium && npm run dev`. Call `http://localhost:3001/api/scrape/phivolcs/earthquakes` from the browser — verify JSON array of PH earthquakes with real data. Start Vite frontend and confirm `src/api/phivolcs.js` fetches through the dev proxy.

### Step 3: Agent Framework & Prompt Engineering
**Files:** `src/utils/prompts.js`, `src/agents/riskAssessment.js`, `src/agents/suppliesPlanning.js`, `src/agents/evacuationRouting.js`, `src/agents/communicationDraft.js`, `src/agents/orchestrator.js`, `src/hooks/useAgents.js`
**What:** Build Philippines-specific prompt templates for each agent:
- **Risk Assessment prompt:** Analyzes Open-Meteo weather data, USGS earthquake activity, EONET/GDACS events near the user, **PAGASA typhoon bulletins & flood watch** (scraped), **PHIVOLCS earthquake intensity & volcano alerts** (scraped). Returns structured JSON with risk level, active threats (typhoon/earthquake/flood/volcanic), threat details, and PH-specific advisories including PHIVOLCS intensity readings and PAGASA signal numbers.
- **Supplies Planning prompt:** Takes risk assessment output, generates a checklist of locally available Philippine supplies (e.g., sardinas, instant noodles, gallon water jugs, gasul, battery-powered radio) categorized by priority and disaster type.
- **Evacuation Routing prompt:** Takes nearby facilities data (from Geoapify Places API) and risk type, recommends which facilities to evacuate to based on disaster type (e.g., schools for typhoons, open areas for earthquakes).
- **Communication Drafting prompt:** Generates bilingual (Filipino/English) emergency templates — SMS to family, barangay notification, social media check-in, with NDRRMC hotlines embedded.

Build the orchestrator: risk assessment runs first (fetching from all APIs + scraped sources) → its output feeds into supplies + evacuation + comms agents running in parallel. Create `useAgents` hook exposing `runAllAgents(location)` and per-agent states (idle/running/complete/error).
**Testing:** Call `runAllAgents({ lat: 14.5995, lon: 120.9842, name: "Manila" })` — verify all four agents return structured JSON including PAGASA/PHIVOLCS data. Confirm the orchestrator chains correctly (risk first, then the other three).

### Step 4: Landing Page & Location Onboarding
**Files:** `src/App.jsx`, `src/App.css`, `src/index.css`, `src/main.jsx`, `src/components/landing/LandingPage.jsx`, `src/components/onboarding/LocationInput.jsx`, `src/components/common/LoadingSpinner.jsx`, `src/components/common/Card.jsx`, `src/components/layout/Header.jsx`, `src/components/layout/Layout.jsx`
**What:** Replace the Vite boilerplate with the Overwatch AI app shell. Build a hero landing page with Philippine-contextualized branding — tagline: "Your AI-Powered Emergency Preparedness Companion for the Philippines", visual cues relevant to PH disaster types (typhoon, earthquake, flood icons). Prominent "Get Started" CTA. Create the `LocationInput` component with: (1) "Use My Location" button (browser Geolocation API), (2) manual city/municipality search querying Geoapify Autocomplete with `countrycode:ph` filter, (3) location confirmation with mini-map preview using Geoapify Map Tiles centered on the Philippines. Set up `react-router-dom` with routes: `/` (landing), `/setup` (location input), `/dashboard` (results). Build reusable `Card`, `LoadingSpinner`, `Header`, and `Layout` components.
**Testing:** Full onboarding flow: Landing → "Get Started" → location input → type "Quezon City" or use geolocation → confirm location on mini-map → navigate to dashboard.

### Step 5: Dashboard & Risk Assessment Panel
**Files:** `src/components/dashboard/Dashboard.jsx`, `src/components/dashboard/AgentStatusBar.jsx`, `src/components/dashboard/RiskPanel.jsx`
**What:** Build the main dashboard as a responsive grid. Create `AgentStatusBar` showing 4 agents with animated status icons (idle → running → complete → error). Build `RiskPanel` displaying: overall risk level (color-coded badge: Mababa/Katamtaman/Mataas/Matindi or Low/Moderate/High/Extreme), current weather conditions with typhoon tracking from Open-Meteo + **PAGASA typhoon bulletins** (scraped), recent earthquake activity from USGS + **PHIVOLCS intensity readings** (scraped), **active volcano alerts from PHIVOLCS** (scraped), active EONET/GDACS disaster events, **PAGASA flood watch status** (scraped), and an AI-generated risk summary narrative contextualized to the Philippine location with PHIVOLCS/PAGASA-specific data. On dashboard mount, trigger orchestrator. Risk panel fills first, then others populate as their agents finish.
**Testing:** Navigate to dashboard for a Manila location → agent statuses animate → risk panel shows real Open-Meteo weather + USGS earthquake data + **PAGASA/PHIVOLCS scraped data** → Gemini generates a PH-contextualized risk summary with PHIVOLCS intensity and PAGASA signal info.

### Step 6: Supplies Planning Panel
**Files:** `src/components/dashboard/SuppliesPanel.jsx`
**What:** Build the `SuppliesPanel` rendering a Gemini-generated supply checklist adapted for Philippine availability. Categories: Tubig at Pagkain (Water & Food), Gamot (Medical), Dokumento (Documents), Komunikasyon (Communication), Silungan (Shelter), Kagamitan (Tools). Each item shows: name (Filipino + English), quantity, checkbox, reason (tied to identified risk). Disaster-specific lists — typhoon kit includes rope, flashlight, canned goods, water gallon, emergency radio; earthquake kit includes hard hat, whistle, first aid; flood kit includes waterproof bags, life vest. "Download Checklist" exports a printable view. Persist checkbox state to `localStorage`.
**Testing:** Supply checklist renders with PH-relevant items → categories are properly grouped → checkboxes persist on refresh → download produces a usable list.

### Step 7: Evacuation Routing Panel & Interactive Map
**Files:** `src/components/dashboard/EvacuationPanel.jsx`, `src/components/dashboard/Map.jsx`
**What:** Build the `Map` component using `react-leaflet` with **Geoapify Map Tiles** (`https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey={GEOAPIFY_API_KEY}`), centered on the user's PH location. Query **Geoapify Places API** for nearby government facilities (hospitals: `healthcare.hospital`, schools: `education.school`, fire stations: `service.fire_station`, police stations: `service.police`) within a configurable radius (default 5km). Display facilities as categorized markers with custom icons. For each facility, calculate a route via **Geoapify Routing API** (driving + walking). Build `EvacuationPanel` with: (1) facility list grouped by type, showing name, distance, and estimated travel time, (2) disaster-aware recommendations from Gemini (e.g., "For typhoon: evacuate to nearest school" vs "For earthquake: go to open park"), (3) clicking a facility shows its route on the map as a polyline.
**Testing:** Map renders with Geoapify tiles centered on PH location → markers appear for nearby hospitals, schools, fire stations → clicking a facility draws a route polyline → travel time/distance displayed → recommendations match disaster type.

### Step 8: Communication Drafting Panel
**Files:** `src/components/dashboard/CommsPanel.jsx`
**What:** Build the `CommsPanel` displaying AI-generated bilingual (Filipino/English) communication templates:
1. **Emergency SMS** — Pre-written text message to family: "Nasa [location] ako. May [disaster type]. Ligtas ako. Pupunta ako sa [evacuation point]."
2. **Family Meeting Point Plan** — Designated meet-up location, backup plans
3. **Barangay/LGU Notification** — Template for reporting to local government
4. **Social Media Safety Check-in** — Facebook-style "I'm safe" post
5. **Emergency Hotlines Reference** — NDRRMC (911), Red Cross (143), Fire (160), PNP (117), local rescue numbers

Each template is editable with "Copy to Clipboard" button. Include emergency contacts mini-form (name, phone, relationship) that auto-populates into templates. Persist contacts to `localStorage`.
**Testing:** Templates render with location-specific content in Filipino/English → copy-to-clipboard works → emergency contacts persist and insert into templates → hotlines are accurate.

### Step 9: Polish, Responsive Design & Final Integration
**Files:** `src/App.css`, `src/index.css`, all component files, `README.md`
**What:** Final polish: consistent color scheme (navy primary, red/amber for alerts, green for safe), smooth loading transitions, error handling with retry UI for API failures (with fallback messages). Mobile-first responsive layout — dashboard panels stack vertically on phones. Add "I-update ang Plano" (Regenerate Plan) button. Add "Palitan ang Lokasyon" (Change Location) to return to setup. Empty states with helpful messages. Update `README.md` with: project overview, setup instructions (Gemini API key + Geoapify API key + Playwright backend setup: `cd server && npm install && npx playwright install chromium`), architecture diagram, API documentation, screenshots. Add Philippine flag/map branding touches.
**Testing:** End-to-end: Start scraping backend (`cd server && npm run dev`) → Start frontend (`npm run dev`) → Landing → Location (any PH city) → Dashboard with all 4 panels populated → responsive at 375px/768px/1440px → API error states graceful → README complete for hackathon judges.
