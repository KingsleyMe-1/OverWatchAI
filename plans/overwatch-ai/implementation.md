# Overwatch AI — Autonomous Personal Emergency Planner (Philippines)

## Goal
Implement a production-ready MVP of Overwatch AI that combines real-time disaster intelligence, Philippine-specific scraped advisories, AI-generated preparedness guidance, and map-based evacuation routing in a React + Vite application with a Node + Playwright scraping backend.

## Prerequisites
Make sure that the user is currently on the `feat/overwatch-ai-mvp` branch before beginning implementation.
If not, move to the correct branch. If the branch does not exist, create it from `main`.

### Branch setup (PowerShell)
- [x] Check current branch:

```powershell
git branch --show-current
```

- [x] Create/switch branch if needed:

```powershell
git checkout main
git pull
git checkout -b feat/overwatch-ai-mvp
```

### Technology stack and dependencies
- Frontend: React 19, Vite 7, Tailwind CSS 4
- Backend scraper: Node.js, Express, Playwright
- Mapping: Leaflet + react-leaflet + Geoapify Map Tiles
- AI: Gemini 2.5 Flash
- Disaster/geo data: Open-Meteo, USGS, NASA EONET, GDACS, ReliefWeb, Geoapify

---

## Step-by-Step Instructions

#### Step 1: Project Foundation & Core Infrastructure
- [x] Install frontend dependencies:

```powershell
Set-Location "c:\Users\Kingsley\OneDrive\Documents\Web_Projects\OverWatchAI"
npm install
npm install react-router-dom react-leaflet leaflet lucide-react
```

- [x] Copy and paste code below into `package.json`:

```json
{
  "name": "overwatchai",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@tailwindcss/vite": "^4.2.1",
    "leaflet": "^1.9.4",
    "lucide-react": "^0.554.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-leaflet": "^5.0.0",
    "react-router-dom": "^7.9.4",
    "tailwindcss": "^4.2.1"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.1",
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.1",
    "eslint": "^9.39.1",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.4.24",
    "globals": "^16.5.0",
    "vite": "^7.3.1"
  }
}
```

- [x] Copy and paste code below into `.env.example`:

```env
VITE_GEMINI_API_KEY=
GEOAPIFY_API_KEY=
SCRAPER_URL=http://localhost:3001
```

- [x] Copy and paste code below into `.gitignore`:

```gitignore
node_modules
dist
.env
.env.local
.DS_Store
server/node_modules
server/.cache
```

- [x] Copy and paste code below into `vite.config.js`:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/scrape': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
```

- [x] Create `src/utils/constants.js` and paste:

```js
export const PH_BBOX = {
  minLat: 4.5,
  maxLat: 21.5,
  minLon: 116,
  maxLon: 127,
}

export const DISASTER_TYPES = ['typhoon', 'earthquake', 'flood', 'volcano']

export const HOTLINES = {
  ndrrmc: '911',
  redCross: '143',
  fire: '160',
  pnp: '117',
}

export const GEOAPIFY_TILE_URL =
  'https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey={apiKey}'
```

- [x] Create `src/context/AppContext.jsx` and paste:

```jsx
import { createContext, useContext, useMemo, useState } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [location, setLocation] = useState(null)
  const [agentState, setAgentState] = useState({
    risk: { status: 'idle', data: null, error: null },
    supplies: { status: 'idle', data: null, error: null },
    evacuation: { status: 'idle', data: null, error: null },
    comms: { status: 'idle', data: null, error: null },
  })

  const value = useMemo(
    () => ({ location, setLocation, agentState, setAgentState }),
    [location, agentState],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppContext() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used inside AppProvider')
  return ctx
}
```

- [x] Create `src/api/weather.js` and paste:

```js
const BASE = 'https://api.open-meteo.com/v1/forecast'

export async function getWeatherForecast(lat, lon) {
  const url = new URL(BASE)
  url.searchParams.set('latitude', String(lat))
  url.searchParams.set('longitude', String(lon))
  url.searchParams.set(
    'hourly',
    'temperature_2m,relative_humidity_2m,precipitation,windspeed_10m,windgusts_10m,pressure_msl,weathercode',
  )
  url.searchParams.set(
    'daily',
    'weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,windgusts_10m_max',
  )
  url.searchParams.set('timezone', 'Asia/Manila')
  url.searchParams.set('forecast_days', '7')

  const response = await fetch(url)
  if (!response.ok) throw new Error('Open-Meteo request failed')
  return response.json()
}
```

- [x] Create `src/api/disasters.js` and paste:

```js
import { PH_BBOX } from '../utils/constants'

export async function getUsgsEarthquakes() {
  const url = new URL('https://earthquake.usgs.gov/fdsnws/event/1/query')
  url.searchParams.set('format', 'geojson')
  url.searchParams.set('minlatitude', String(PH_BBOX.minLat))
  url.searchParams.set('maxlatitude', String(PH_BBOX.maxLat))
  url.searchParams.set('minlongitude', String(PH_BBOX.minLon))
  url.searchParams.set('maxlongitude', String(PH_BBOX.maxLon))
  url.searchParams.set('minmagnitude', '2.5')
  url.searchParams.set('orderby', 'time')
  url.searchParams.set('limit', '50')
  const response = await fetch(url)
  if (!response.ok) throw new Error('USGS request failed')
  return response.json()
}

export async function getEonetEvents() {
  const url =
    'https://eonet.gsfc.nasa.gov/api/v3/events/geojson?status=open&bbox=116,4.5,127,21.5&limit=50'
  const response = await fetch(url)
  if (!response.ok) throw new Error('EONET request failed')
  return response.json()
}

export async function getGdacsRss() {
  const response = await fetch('https://www.gdacs.org/xml/rss.xml')
  if (!response.ok) throw new Error('GDACS request failed')
  return response.text()
}

export async function getReliefwebReports() {
  const url =
    'https://api.reliefweb.int/v2/reports?appname=overwatch-ai&filter[field]=country.name&filter[value]=Philippines&sort[]=date:desc&limit=10'
  const response = await fetch(url)
  if (!response.ok) throw new Error('ReliefWeb request failed')
  return response.json()
}
```

- [x] Create `src/api/geoapify.js` and paste:

```js
const API_KEY = import.meta.env.GEOAPIFY_API_KEY

function requireKey() {
  if (!API_KEY) throw new Error('Missing GEOAPIFY_API_KEY')
}

export async function geocodeSearch(text) {
  requireKey()
  const url = new URL('https://api.geoapify.com/v1/geocode/search')
  url.searchParams.set('text', text)
  url.searchParams.set('filter', 'countrycode:ph')
  url.searchParams.set('apiKey', API_KEY)
  const response = await fetch(url)
  if (!response.ok) throw new Error('Geoapify geocode search failed')
  return response.json()
}

export async function geocodeAutocomplete(text) {
  requireKey()
  const url = new URL('https://api.geoapify.com/v1/geocode/autocomplete')
  url.searchParams.set('text', text)
  url.searchParams.set('filter', 'countrycode:ph')
  url.searchParams.set('apiKey', API_KEY)
  const response = await fetch(url)
  if (!response.ok) throw new Error('Geoapify autocomplete failed')
  return response.json()
}

export async function reverseGeocode(lat, lon) {
  requireKey()
  const url = new URL('https://api.geoapify.com/v1/geocode/reverse')
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lon))
  url.searchParams.set('apiKey', API_KEY)
  const response = await fetch(url)
  if (!response.ok) throw new Error('Geoapify reverse geocode failed')
  return response.json()
}

export async function getRoute(from, to, mode = 'drive') {
  requireKey()
  const url = new URL('https://api.geoapify.com/v1/routing')
  url.searchParams.set('waypoints', `${from.lat},${from.lon}|${to.lat},${to.lon}`)
  url.searchParams.set('mode', mode)
  url.searchParams.set('apiKey', API_KEY)
  const response = await fetch(url)
  if (!response.ok) throw new Error('Geoapify routing failed')
  return response.json()
}

export async function findNearbyFacilities(lat, lon, categories, radius = 5000) {
  requireKey()
  const url = new URL('https://api.geoapify.com/v2/places')
  url.searchParams.set('categories', categories.join(','))
  url.searchParams.set('filter', `circle:${lon},${lat},${radius}`)
  url.searchParams.set('limit', '20')
  url.searchParams.set('apiKey', API_KEY)
  const response = await fetch(url)
  if (!response.ok) throw new Error('Geoapify places failed')
  return response.json()
}
```

- [x] Create `src/api/gemini.js` and paste:

```js
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const MODEL = 'gemini-2.5-flash'

function parseJsonSafe(text) {
  const clean = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
  return JSON.parse(clean)
}

export async function generateJson(prompt, schemaHint) {
  if (!API_KEY) throw new Error('Missing VITE_GEMINI_API_KEY')

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`
  const body = {
    contents: [{ role: 'user', parts: [{ text: `${prompt}\n\nReturn only JSON.` }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
    },
  }
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) throw new Error('Gemini request failed')

  const data = await response.json()
  const text =
    data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '{}'

  try {
    return parseJsonSafe(text)
  } catch {
    throw new Error(`Gemini returned non-JSON output. Expected: ${schemaHint}`)
  }
}
```

##### Step 1 Verification Checklist
- [x] `npm run lint` completes without new errors in changed files
- [x] `npm run dev` starts successfully on `http://localhost:5173`
- [x] Geoapify helper throws clear error when API key is missing
- [x] `vite.config.js` proxy includes `/api/scrape`

#### Step 1 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 2: Playwright Scraping Backend (PAGASA & PHIVOLCS)
- [x] Initialize backend:

```powershell
Set-Location "c:\Users\Kingsley\OneDrive\Documents\Web_Projects\OverWatchAI"
New-Item -ItemType Directory -Path .\server -Force | Out-Null
Set-Location .\server
npm init -y
npm install express cors playwright
npx playwright install chromium
```

- [x] Copy and paste code below into `server/package.json`:

```json
{
  "name": "overwatchai-scraper",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.21.2",
    "playwright": "^1.56.1"
  }
}
```

- [x] Create `server/cache.js`:

```js
const store = new Map()

export function getCached(key) {
  const value = store.get(key)
  if (!value) return null
  if (Date.now() > value.expiry) {
    store.delete(key)
    return null
  }
  return value.data
}

export function setCached(key, data, ttlMs = 15 * 60 * 1000) {
  store.set(key, { data, expiry: Date.now() + ttlMs })
}
```

- [x] Create `server/scrapers/phivolcsEarthquakes.js`:

```js
import { chromium } from 'playwright'

export async function scrapePhivolcsEarthquakes() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  try {
    await page.goto('https://earthquake.phivolcs.dost.gov.ph', {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    })

    const rows = await page.$$eval('table tr', (trNodes) =>
      trNodes
        .map((tr) =>
          Array.from(tr.querySelectorAll('td')).map((td) => td.textContent?.trim() || ''),
        )
        .filter((cells) => cells.length >= 6)
        .map((cells) => ({
          datetime: cells[0],
          latitude: cells[1],
          longitude: cells[2],
          depth: cells[3],
          magnitude: cells[4],
          location: cells[5],
          phivolcsIntensity: null,
        })),
    )

    return rows
  } finally {
    await page.close()
    await browser.close()
  }
}
```

- [x] Create `server/scrapers/phivolcsVolcanoes.js`:

```js
import { chromium } from 'playwright'

export async function scrapePhivolcsVolcanoes() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  try {
    await page.goto('https://wovodat.phivolcs.dost.gov.ph/bulletin/list-of-bulletin', {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    })

    const bulletins = await page.$$eval('table tr', (rows) =>
      rows
        .map((row) => Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent?.trim() || ''))
        .filter((cells) => cells.length >= 3)
        .map((cells) => ({
          volcano: cells[0],
          alertLevel: cells[1],
          alertDescription: cells[2],
          date: cells[3] || '',
          so2Flux: null,
          seismicEvents: null,
        })),
    )

    return bulletins
  } finally {
    await page.close()
    await browser.close()
  }
}
```

- [x] Create `server/scrapers/pagasaWeather.js`:

```js
import { chromium } from 'playwright'

export async function scrapePagasaWeather() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  try {
    await page.goto('https://bagong.pagasa.dost.gov.ph/weather', {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    })

    const synopsis = await page
      .$eval('body', (body) => body.innerText)
      .then((text) => text.slice(0, 2000))

    const pubfiles = await fetch('https://pubfiles.pagasa.dost.gov.ph/tamss/weather/')
    const pubfilesText = pubfiles.ok ? await pubfiles.text() : ''
    const activeTyphoons = Array.from(pubfilesText.matchAll(/track_([a-z0-9_-]+)\.png/gi)).map(
      (match) => match[1],
    )

    return {
      synopsis,
      activeTyphoons: [...new Set(activeTyphoons)],
      forecasts: [],
    }
  } finally {
    await page.close()
    await browser.close()
  }
}
```

- [x] Create `server/scrapers/pagasaFlood.js`:

```js
import { chromium } from 'playwright'

export async function scrapePagasaFlood() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  try {
    await page.goto('https://bagong.pagasa.dost.gov.ph/flood', {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    })

    const riverBasins = await page.$$eval('table tr', (rows) =>
      rows
        .map((row) => Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent?.trim() || ''))
        .filter((cells) => cells.length >= 2)
        .map((cells) => ({ name: cells[0], status: cells[1] })),
    )

    return { riverBasins, dams: [] }
  } finally {
    await page.close()
    await browser.close()
  }
}
```

- [x] Create `server/index.js`:

```js
import cors from 'cors'
import express from 'express'
import { getCached, setCached } from './cache.js'
import { scrapePagasaFlood } from './scrapers/pagasaFlood.js'
import { scrapePagasaWeather } from './scrapers/pagasaWeather.js'
import { scrapePhivolcsEarthquakes } from './scrapers/phivolcsEarthquakes.js'
import { scrapePhivolcsVolcanoes } from './scrapers/phivolcsVolcanoes.js'

const app = express()
const port = 3001

app.use(
  cors({
    origin: ['http://localhost:5173'],
  }),
)

async function serveWithCache(key, res, fn) {
  try {
    const cached = getCached(key)
    if (cached) {
      return res.json({ ok: true, data: cached, meta: { cached: true } })
    }
    const data = await fn()
    setCached(key, data)
    return res.json({ ok: true, data, meta: { cached: false } })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: {
        code: 'SCRAPER_ERROR',
        message: error.message,
        source: 'SCRAPER',
        retryable: true,
      },
      data: null,
      meta: {},
    })
  }
}

app.get('/api/scrape/phivolcs/earthquakes', (req, res) =>
  serveWithCache('phivolcs-earthquakes', res, scrapePhivolcsEarthquakes),
)
app.get('/api/scrape/phivolcs/volcanoes', (req, res) =>
  serveWithCache('phivolcs-volcanoes', res, scrapePhivolcsVolcanoes),
)
app.get('/api/scrape/pagasa/weather', (req, res) =>
  serveWithCache('pagasa-weather', res, scrapePagasaWeather),
)
app.get('/api/scrape/pagasa/flood', (req, res) =>
  serveWithCache('pagasa-flood', res, scrapePagasaFlood),
)

app.listen(port, () => {
  console.log(`Scraper backend running on http://localhost:${port}`)
})
```

- [x] Create `src/api/phivolcs.js`:

```js
export async function getPhivolcsEarthquakes() {
  const response = await fetch('/api/scrape/phivolcs/earthquakes')
  if (!response.ok) throw new Error('Failed to fetch PHIVOLCS earthquakes')
  const payload = await response.json()
  return payload.data
}

export async function getPhivolcsVolcanoes() {
  const response = await fetch('/api/scrape/phivolcs/volcanoes')
  if (!response.ok) throw new Error('Failed to fetch PHIVOLCS volcanoes')
  const payload = await response.json()
  return payload.data
}
```

- [x] Create `src/api/pagasa.js`:

```js
export async function getPagasaWeather() {
  const response = await fetch('/api/scrape/pagasa/weather')
  if (!response.ok) throw new Error('Failed to fetch PAGASA weather')
  const payload = await response.json()
  return payload.data
}

export async function getPagasaFlood() {
  const response = await fetch('/api/scrape/pagasa/flood')
  if (!response.ok) throw new Error('Failed to fetch PAGASA flood')
  const payload = await response.json()
  return payload.data
}
```

##### Step 2 Verification Checklist
- [x] `cd server && npm run dev` starts backend on `http://localhost:3001`
- [x] `GET /api/scrape/phivolcs/earthquakes` returns `{ ok: true, data: [...] }`
- [x] `GET /api/scrape/pagasa/flood` returns `{ ok: true, data: {...} }`
- [x] Frontend can call `/api/scrape/*` through Vite proxy without CORS errors

#### Step 2 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 3: Agent Framework & Prompt Engineering
- [x] Create `src/utils/prompts.js`:

```js
export function riskPrompt(input) {
  return `Analyze disaster risk for ${input.locationName} in the Philippines. Data: ${JSON.stringify(
    input,
  )}. Return JSON: {"riskLevel":"low|moderate|high|extreme","activeThreats":[],"summary":""}`
}

export function suppliesPrompt(input) {
  return `Generate a Philippines-focused emergency supply checklist based on: ${JSON.stringify(
    input,
  )}. Return JSON: {"categories":[{"name":"","items":[{"name":"","quantity":"","reason":""}]}]}`
}

export function evacuationPrompt(input) {
  return `Recommend evacuation priorities from facilities data: ${JSON.stringify(
    input,
  )}. Return JSON: {"recommendations":[],"topFacilities":[]}`
}

export function commsPrompt(input) {
  return `Generate bilingual Filipino/English emergency communication drafts from: ${JSON.stringify(
    input,
  )}. Return JSON: {"sms":"","barangayNotice":"","socialPost":"","meetingPlan":""}`
}
```

- [x] Create `src/agents/riskAssessment.js`:

```js
import { getEonetEvents, getGdacsRss, getReliefwebReports, getUsgsEarthquakes } from '../api/disasters'
import { generateJson } from '../api/gemini'
import { getPagasaFlood, getPagasaWeather } from '../api/pagasa'
import { getPhivolcsEarthquakes, getPhivolcsVolcanoes } from '../api/phivolcs'
import { getWeatherForecast } from '../api/weather'
import { riskPrompt } from '../utils/prompts'

export async function runRiskAssessment(location) {
  const [weather, usgs, eonet, gdacs, reliefweb, pagasaWeather, pagasaFlood, phEq, phVol] =
    await Promise.all([
      getWeatherForecast(location.lat, location.lon),
      getUsgsEarthquakes(),
      getEonetEvents(),
      getGdacsRss(),
      getReliefwebReports(),
      getPagasaWeather(),
      getPagasaFlood(),
      getPhivolcsEarthquakes(),
      getPhivolcsVolcanoes(),
    ])

  const input = {
    locationName: location.name,
    weather,
    usgs,
    eonet,
    gdacs,
    reliefweb,
    pagasaWeather,
    pagasaFlood,
    phivolcsEarthquakes: phEq,
    phivolcsVolcanoes: phVol,
  }

  return generateJson(riskPrompt(input), 'risk assessment schema')
}
```

- [x] Create `src/agents/suppliesPlanning.js`:

```js
import { generateJson } from '../api/gemini'
import { suppliesPrompt } from '../utils/prompts'

export async function runSuppliesPlanning(riskData) {
  return generateJson(suppliesPrompt(riskData), 'supplies checklist schema')
}
```

- [x] Create `src/agents/evacuationRouting.js`:

```js
import { findNearbyFacilities, getRoute } from '../api/geoapify'
import { generateJson } from '../api/gemini'
import { evacuationPrompt } from '../utils/prompts'

const CATEGORIES = ['healthcare.hospital', 'education.school', 'service.fire_station', 'service.police']

export async function runEvacuationRouting(location, riskData) {
  const facilities = await findNearbyFacilities(location.lat, location.lon, CATEGORIES, 5000)

  const top = (facilities.features || []).slice(0, 5)
  const routes = await Promise.all(
    top.map(async (feature) => {
      const [lon, lat] = feature.geometry.coordinates
      const route = await getRoute(
        { lat: location.lat, lon: location.lon },
        { lat, lon },
        'drive',
      )
      return { feature, route }
    }),
  )

  const recommendations = await generateJson(
    evacuationPrompt({ location, riskData, facilities: top }),
    'evacuation recommendations schema',
  )

  return { facilities: top, routes, recommendations }
}
```

- [x] Create `src/agents/communicationDraft.js`:

```js
import { generateJson } from '../api/gemini'
import { commsPrompt } from '../utils/prompts'

export async function runCommunicationDraft(location, riskData) {
  return generateJson(commsPrompt({ location, riskData }), 'communication drafts schema')
}
```

- [x] Create `src/agents/orchestrator.js`:

```js
import { runCommunicationDraft } from './communicationDraft'
import { runEvacuationRouting } from './evacuationRouting'
import { runRiskAssessment } from './riskAssessment'
import { runSuppliesPlanning } from './suppliesPlanning'

export async function runAllAgents(location, setAgentState) {
  setAgentState((prev) => ({
    ...prev,
    risk: { status: 'running', data: null, error: null },
    supplies: { status: 'idle', data: null, error: null },
    evacuation: { status: 'idle', data: null, error: null },
    comms: { status: 'idle', data: null, error: null },
  }))

  try {
    const risk = await runRiskAssessment(location)
    setAgentState((prev) => ({ ...prev, risk: { status: 'complete', data: risk, error: null } }))

    setAgentState((prev) => ({
      ...prev,
      supplies: { ...prev.supplies, status: 'running' },
      evacuation: { ...prev.evacuation, status: 'running' },
      comms: { ...prev.comms, status: 'running' },
    }))

    const [supplies, evacuation, comms] = await Promise.all([
      runSuppliesPlanning(risk),
      runEvacuationRouting(location, risk),
      runCommunicationDraft(location, risk),
    ])

    setAgentState((prev) => ({
      ...prev,
      supplies: { status: 'complete', data: supplies, error: null },
      evacuation: { status: 'complete', data: evacuation, error: null },
      comms: { status: 'complete', data: comms, error: null },
    }))
  } catch (error) {
    setAgentState((prev) => ({
      ...prev,
      risk: { status: 'error', data: null, error: error.message },
    }))
  }
}
```

- [x] Create `src/hooks/useAgents.js`:

```js
import { useCallback } from 'react'
import { runAllAgents } from '../agents/orchestrator'
import { useAppContext } from '../context/AppContext'

export function useAgents() {
  const { location, agentState, setAgentState } = useAppContext()

  const run = useCallback(async () => {
    if (!location) return
    await runAllAgents(location, setAgentState)
  }, [location, setAgentState])

  return {
    location,
    agentState,
    runAllAgents: run,
  }
}
```

##### Step 3 Verification Checklist
- [x] Running `runAllAgents` updates statuses in order: `risk` then parallel agents
- [x] Risk output includes weather + USGS + PAGASA + PHIVOLCS inputs
- [x] Supplies/Evacuation/Comms receive risk output as input

#### Step 3 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 4: Landing Page & Location Onboarding
- [x] Copy and paste code below into `src/main.jsx`:

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { AppProvider } from './context/AppContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </StrictMode>,
)
```

- [x] Create `src/components/common/Card.jsx`:

```jsx
export default function Card({ title, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      {title ? <h3 className="mb-3 text-lg font-semibold text-slate-900">{title}</h3> : null}
      {children}
    </section>
  )
}
```

- [x] Create `src/components/common/LoadingSpinner.jsx`:

```jsx
export default function LoadingSpinner({ label = 'Loading...' }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
      <span>{label}</span>
    </div>
  )
}
```

- [x] Create `src/components/layout/Header.jsx`:

```jsx
import { ShieldAlert } from 'lucide-react'

export default function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <ShieldAlert className="text-blue-700" size={20} />
        <p className="font-semibold text-slate-900">Overwatch AI</p>
      </div>
    </header>
  )
}
```

- [x] Create `src/components/layout/Layout.jsx`:

```jsx
import Header from './Header'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}
```

- [x] Create `src/components/landing/LandingPage.jsx`:

```jsx
import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-bold text-slate-900">Your AI-Powered Emergency Preparedness Companion for the Philippines</h1>
      <p className="mt-3 text-slate-600">Prepare for typhoons, earthquakes, floods, and volcanic activity with localized data and actionable plans.</p>
      <Link
        to="/setup"
        className="mt-6 inline-flex rounded-lg bg-blue-700 px-5 py-3 font-medium text-white hover:bg-blue-800"
      >
        Get Started
      </Link>
    </div>
  )
}
```

- [x] Create `src/components/onboarding/LocationInput.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { geocodeAutocomplete, reverseGeocode } from '../../api/geoapify'
import { useAppContext } from '../../context/AppContext'

export default function LocationInput() {
  const navigate = useNavigate()
  const { setLocation } = useAppContext()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])

  useEffect(() => {
    if (query.length < 3) {
      setResults([])
      return
    }
    const id = setTimeout(async () => {
      try {
        const data = await geocodeAutocomplete(query)
        setResults(data.features || [])
      } catch {
        setResults([])
      }
    }, 350)
    return () => clearTimeout(id)
  }, [query])

  async function useMyLocation() {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude
      const lon = pos.coords.longitude
      const rev = await reverseGeocode(lat, lon)
      const feature = rev.features?.[0]
      setLocation({ lat, lon, name: feature?.properties?.formatted || 'Current location' })
      navigate('/dashboard')
    })
  }

  function selectFeature(feature) {
    const [lon, lat] = feature.geometry.coordinates
    setLocation({ lat, lon, name: feature.properties.formatted })
    navigate('/dashboard')
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Choose your location</h2>
      <div className="mt-4 flex flex-col gap-3">
        <button onClick={useMyLocation} className="rounded-lg border border-slate-300 px-4 py-2 text-left">
          Use My Location
        </button>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search city or municipality"
          className="rounded-lg border border-slate-300 px-3 py-2"
        />
        <ul className="space-y-2">
          {results.slice(0, 5).map((feature) => (
            <li key={feature.properties.place_id}>
              <button className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left" onClick={() => selectFeature(feature)}>
                {feature.properties.formatted}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
```

- [x] Copy and paste code below into `src/App.jsx`:

```jsx
import { Navigate, Route, Routes } from 'react-router-dom'
import Dashboard from './components/dashboard/Dashboard'
import LandingPage from './components/landing/LandingPage'
import Layout from './components/layout/Layout'
import LocationInput from './components/onboarding/LocationInput'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/setup" element={<LocationInput />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
```

##### Step 4 Verification Checklist
- [ ] Landing page renders with “Get Started” CTA
- [ ] `/setup` allows geolocation and autocomplete
- [ ] Selecting a location navigates to `/dashboard`

#### Step 4 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 5: Dashboard & Risk Assessment Panel
- [x] Create `src/components/dashboard/AgentStatusBar.jsx`:

```jsx
const AGENTS = [
  ['risk', 'Risk Assessment'],
  ['supplies', 'Supplies Planning'],
  ['evacuation', 'Evacuation Routing'],
  ['comms', 'Communication Drafting'],
]

function color(status) {
  if (status === 'running') return 'bg-amber-100 text-amber-700'
  if (status === 'complete') return 'bg-emerald-100 text-emerald-700'
  if (status === 'error') return 'bg-rose-100 text-rose-700'
  return 'bg-slate-100 text-slate-600'
}

export default function AgentStatusBar({ state }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {AGENTS.map(([key, label]) => (
        <div key={key} className={`rounded-lg px-3 py-2 text-sm font-medium ${color(state[key].status)}`}>
          {label}: {state[key].status}
        </div>
      ))}
    </div>
  )
}
```

- [x] Create `src/components/dashboard/RiskPanel.jsx`:

```jsx
import Card from '../common/Card'

export default function RiskPanel({ risk }) {
  if (!risk) return <Card title="Risk Assessment">No risk analysis yet.</Card>
  return (
    <Card title="Risk Assessment">
      <p className="text-sm"><strong>Risk Level:</strong> {risk.riskLevel || 'unknown'}</p>
      <p className="mt-2 text-sm"><strong>Summary:</strong> {risk.summary || 'No summary available.'}</p>
      <ul className="mt-3 list-disc pl-5 text-sm">
        {(risk.activeThreats || []).map((threat, index) => (
          <li key={index}>{typeof threat === 'string' ? threat : JSON.stringify(threat)}</li>
        ))}
      </ul>
    </Card>
  )
}
```

- [x] Create `src/components/dashboard/Dashboard.jsx`:

```jsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import { useAgents } from '../../hooks/useAgents'
import LoadingSpinner from '../common/LoadingSpinner'
import AgentStatusBar from './AgentStatusBar'
import CommsPanel from './CommsPanel'
import EvacuationPanel from './EvacuationPanel'
import RiskPanel from './RiskPanel'
import SuppliesPanel from './SuppliesPanel'

export default function Dashboard() {
  const navigate = useNavigate()
  const { location, agentState } = useAppContext()
  const { runAllAgents } = useAgents()

  useEffect(() => {
    if (!location) {
      navigate('/setup')
      return
    }
    runAllAgents()
  }, [location, navigate, runAllAgents])

  if (!location) return <LoadingSpinner label="Preparing dashboard..." />

  return (
    <div className="space-y-4">
      <AgentStatusBar state={agentState} />
      <div className="grid gap-4 lg:grid-cols-2">
        <RiskPanel risk={agentState.risk.data} />
        <SuppliesPanel supplies={agentState.supplies.data} />
        <EvacuationPanel evacuation={agentState.evacuation.data} location={location} />
        <CommsPanel comms={agentState.comms.data} />
      </div>
    </div>
  )
}
```

##### Step 5 Verification Checklist
- [x] Dashboard route redirects to setup when location is missing
- [x] Agent status transitions are visible
- [x] Risk panel renders Gemini risk output fields

#### Step 5 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 6: Supplies Planning Panel
- [x] Create `src/components/dashboard/SuppliesPanel.jsx`:

```jsx
import { useEffect, useState } from 'react'
import Card from '../common/Card'

const KEY = 'overwatch-checklist'

export default function SuppliesPanel({ supplies }) {
  const [checks, setChecks] = useState({})

  useEffect(() => {
    const raw = localStorage.getItem(KEY)
    if (raw) setChecks(JSON.parse(raw))
  }, [])

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(checks))
  }, [checks])

  function toggle(itemKey) {
    setChecks((prev) => ({ ...prev, [itemKey]: !prev[itemKey] }))
  }

  function downloadChecklist() {
    const content = JSON.stringify(supplies, null, 2)
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'overwatch-supplies-checklist.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const categories = supplies?.categories || []

  return (
    <Card title="Supplies Planning">
      <button onClick={downloadChecklist} className="mb-3 rounded bg-slate-900 px-3 py-1.5 text-sm text-white">
        Download Checklist
      </button>
      {categories.length === 0 ? (
        <p className="text-sm text-slate-600">No supply checklist yet.</p>
      ) : (
        <div className="space-y-3">
          {categories.map((category, index) => (
            <div key={`${category.name}-${index}`}>
              <h4 className="font-semibold">{category.name}</h4>
              <ul className="mt-1 space-y-1 text-sm">
                {(category.items || []).map((item, itemIndex) => {
                  const itemKey = `${category.name}-${item.name}-${itemIndex}`
                  return (
                    <li key={itemKey} className="flex items-start gap-2">
                      <input type="checkbox" checked={Boolean(checks[itemKey])} onChange={() => toggle(itemKey)} />
                      <span>
                        {item.name} — {item.quantity} ({item.reason})
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
```

##### Step 6 Verification Checklist
- [ ] Checklist categories render when supplies agent finishes
- [ ] Checkbox state persists after page refresh
- [ ] Download action exports checklist file

#### Step 6 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 7: Evacuation Routing Panel & Interactive Map
- [x] Create `src/components/dashboard/Map.jsx`:

```jsx
import 'leaflet/dist/leaflet.css'
import { MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet'

export default function Map({ location, markers = [], routeCoordinates = [] }) {
  const apiKey = import.meta.env.GEOAPIFY_API_KEY
  const center = [location.lat, location.lon]

  return (
    <MapContainer center={center} zoom={12} className="h-72 w-full rounded-lg">
      <TileLayer url={`https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${apiKey}`} />
      <Marker position={center} />
      {markers.map((marker) => (
        <Marker key={marker.id} position={[marker.lat, marker.lon]} />
      ))}
      {routeCoordinates.length > 0 ? <Polyline positions={routeCoordinates} color="blue" /> : null}
    </MapContainer>
  )
}
```

- [x] Create `src/components/dashboard/EvacuationPanel.jsx`:

```jsx
import { useMemo, useState } from 'react'
import Card from '../common/Card'
import Map from './Map'

function toMarker(feature, index) {
  const [lon, lat] = feature.geometry.coordinates
  return {
    id: feature.properties.place_id || `${feature.properties.name}-${index}`,
    name: feature.properties.name || feature.properties.formatted,
    lat,
    lon,
    category: feature.properties.categories?.[0] || 'unknown',
  }
}

export default function EvacuationPanel({ evacuation, location }) {
  const [selected, setSelected] = useState(0)

  const markers = useMemo(() => {
    const facilities = evacuation?.facilities || []
    return facilities.map(toMarker)
  }, [evacuation])

  const routeCoordinates = useMemo(() => {
    const route = evacuation?.routes?.[selected]?.route?.features?.[0]?.geometry?.coordinates || []
    return route.map(([lon, lat]) => [lat, lon])
  }, [evacuation, selected])

  return (
    <Card title="Evacuation Routing">
      <div className="space-y-3">
        <Map location={location} markers={markers} routeCoordinates={routeCoordinates} />
        <ul className="space-y-2 text-sm">
          {(markers || []).map((marker, index) => (
            <li key={marker.id}>
              <button
                onClick={() => setSelected(index)}
                className="w-full rounded border border-slate-200 px-3 py-2 text-left"
              >
                {marker.name} ({marker.category})
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}
```

##### Step 7 Verification Checklist
- [ ] Leaflet map loads with Geoapify tiles
- [ ] Facility markers render from Geoapify places response
- [ ] Selecting a facility draws route polyline

#### Step 7 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 8: Communication Drafting Panel
- [x] Create `src/components/dashboard/CommsPanel.jsx`:

```jsx
import { useEffect, useState } from 'react'
import Card from '../common/Card'

const KEY = 'overwatch-contacts'

export default function CommsPanel({ comms }) {
  const [contacts, setContacts] = useState([{ name: '', phone: '', relationship: '' }])

  useEffect(() => {
    const raw = localStorage.getItem(KEY)
    if (raw) setContacts(JSON.parse(raw))
  }, [])

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(contacts))
  }, [contacts])

  function updateContact(index, field, value) {
    setContacts((prev) =>
      prev.map((contact, i) => (i === index ? { ...contact, [field]: value } : contact)),
    )
  }

  function copyText(text) {
    navigator.clipboard.writeText(text || '')
  }

  const sms = comms?.sms || 'Nasa [location] ako. Ligtas ako. Pupunta ako sa [evacuation point].'
  const barangayNotice = comms?.barangayNotice || 'Mag-uulat po ako ng kasalukuyang sitwasyon sa aming lugar.'
  const socialPost = comms?.socialPost || 'I am safe. Please monitor official advisories and keep emergency lines open.'
  const meetingPlan = comms?.meetingPlan || 'Primary meet-up point: barangay hall. Backup: nearest school.'

  return (
    <Card title="Communication Drafting">
      <div className="space-y-4 text-sm">
        {[['Emergency SMS', sms], ['Barangay Notification', barangayNotice], ['Social Safety Check-in', socialPost], ['Family Meeting Plan', meetingPlan]].map(
          ([title, text]) => (
            <div key={title} className="rounded border border-slate-200 p-3">
              <p className="font-semibold">{title}</p>
              <p className="mt-1 text-slate-700">{text}</p>
              <button onClick={() => copyText(text)} className="mt-2 rounded bg-slate-900 px-2 py-1 text-xs text-white">
                Copy to Clipboard
              </button>
            </div>
          ),
        )}

        <div className="rounded border border-slate-200 p-3">
          <p className="font-semibold">Emergency Contacts</p>
          {contacts.map((contact, index) => (
            <div key={index} className="mt-2 grid gap-2 sm:grid-cols-3">
              <input
                className="rounded border border-slate-300 px-2 py-1"
                placeholder="Name"
                value={contact.name}
                onChange={(e) => updateContact(index, 'name', e.target.value)}
              />
              <input
                className="rounded border border-slate-300 px-2 py-1"
                placeholder="Phone"
                value={contact.phone}
                onChange={(e) => updateContact(index, 'phone', e.target.value)}
              />
              <input
                className="rounded border border-slate-300 px-2 py-1"
                placeholder="Relationship"
                value={contact.relationship}
                onChange={(e) => updateContact(index, 'relationship', e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
```

##### Step 8 Verification Checklist
- [ ] Four communication templates render in panel
- [ ] Copy to clipboard works for each template
- [ ] Contacts persist across refresh via localStorage

#### Step 8 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 9: Polish, Responsive Design & Final Integration
- [x] Copy and paste code below into `src/index.css`:

```css
@import "tailwindcss";

html,
body,
#root {
  min-height: 100%;
}

body {
  margin: 0;
  font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
  background: #f8fafc;
  color: #0f172a;
}
```

- [x] Copy and paste code below into `src/App.css`:

```css
.panel-enter {
  animation: panel-fade 0.25s ease-out;
}

@keyframes panel-fade {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

- [x] Replace `README.md` with project-ready documentation including setup, env vars, and dual-server run commands:

```markdown
# Overwatch AI

Overwatch AI is a Philippines-focused emergency preparedness assistant that combines weather/disaster intelligence, PH government scraping, evacuation routing, and AI-generated preparedness outputs.

## Setup

### 1) Frontend

```bash
npm install
cp .env.example .env
```

Set values in `.env`:

- `VITE_GEMINI_API_KEY`
- `GEOAPIFY_API_KEY`
- `SCRAPER_URL=http://localhost:3001`

### 2) Scraping backend

```bash
cd server
npm install
npx playwright install chromium
npm run dev
```

### 3) Run frontend

```bash
npm run dev
```

## Key Endpoints

- `/api/scrape/phivolcs/earthquakes`
- `/api/scrape/phivolcs/volcanoes`
- `/api/scrape/pagasa/weather`
- `/api/scrape/pagasa/flood`

## Build & Lint

```bash
npm run lint
npm run build
```
```

- [x] Execute final integration checks:

```powershell
Set-Location "c:\Users\Kingsley\OneDrive\Documents\Web_Projects\OverWatchAI"
npm run lint
npm run build
Set-Location .\server
npm run dev
```

##### Step 9 Verification Checklist
- [ ] Frontend and backend both run locally without startup errors
- [ ] Dashboard renders all 4 panels on desktop and mobile widths
- [ ] Retry/fallback behavior shows readable errors when external API calls fail
- [ ] README contains complete setup for judges and teammates

#### Step 9 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

## Final Validation Matrix
- [ ] Frontend: `npm run lint`
- [ ] Frontend: `npm run build`
- [ ] Backend: `cd server && npm run dev`
- [ ] Scraper checks: all `/api/scrape/*` endpoints return valid JSON
- [ ] End-to-end: landing → setup → dashboard with risk/supplies/evacuation/comms populated
