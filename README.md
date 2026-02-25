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
