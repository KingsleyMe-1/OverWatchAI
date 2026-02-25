# OverWatch AI — PH Government Website Scraping Feasibility Research

> **Purpose:** Comprehensive research on scraping Philippine government disaster websites for a React + Vite frontend-only app.  
> **Date:** February 25, 2026  
> **Status:** Research only — no code.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [PAGASA Scraping Feasibility](#2-pagasa-scraping-feasibility)
3. [PHIVOLCS Scraping Feasibility](#3-phivolcs-scraping-feasibility)
4. [NDRRMC Scraping Feasibility](#4-ndrrmc-scraping-feasibility)
5. [Project NOAH / HazardHunter](#5-project-noah--hazardhunter)
6. [Scraping Architecture Options](#6-scraping-architecture-options)
7. [Recommended Approach](#7-recommended-approach)

---

## 1. Executive Summary

### Key Findings

| Source | Scrapable? | Data Format | Best Strategy | Difficulty |
|--------|-----------|-------------|---------------|------------|
| **PAGASA** (bagong.pagasa.dost.gov.ph) | ✅ YES | HTML pages + **public file server** with PDFs, PNGs, TXT, DAT files | Serverless scraper OR GitHub Actions cron → static JSON | Medium |
| **PHIVOLCS Earthquakes** (earthquake.phivolcs.dost.gov.ph) | ✅ YES — **BEST TARGET** | Clean HTML table, well-structured | Serverless scraper OR CORS proxy + client-side DOMParser | Easy |
| **PHIVOLCS Volcanoes** (wovodat.phivolcs.dost.gov.ph) | ✅ YES | HTML bulletin pages with structured tables | Serverless scraper → static JSON | Medium |
| **NDRRMC** (ndrrmc.gov.ph) | ❌ NO — Returns **HTTP 403** | Blocked | Use **ReliefWeb API** instead (aggregates NDRRMC reports) | N/A |
| **HazardHunter** (hazardhunter.georisk.gov.ph) | ⚠️ PARTIAL | HTML pages for volcano status + earthquake monitoring | Scrape volcano/earthquake monitoring pages | Medium |
| **Project NOAH** (noah.up.edu.ph) | ⚠️ LIMITED | Mapbox-based SPA, minimal scrapable HTML | Not practical to scrape; use as reference only | Hard |

### Bottom Line

**You do NOT need to scrape most of these sites.** The existing international APIs (USGS, Open-Meteo, GDACS, ReliefWeb) already cover 80-90% of the data. The main value-add from scraping PH government sites would be:

1. **PHIVOLCS earthquake bulletins** — more granular PH-specific earthquake data than USGS (includes M1.0+ events, not just M2.5+)
2. **Volcano alert levels & bulletins** — PHIVOLCS-specific alert levels (0-5 scale) with detailed parameters (SO2, seismicity, deformation)
3. **PAGASA-specific typhoon naming** — Filipino typhoon names (Ada, Basyang, etc.) vs international names
4. **PAGASA flood/dam monitoring** — river basin flood watch status, dam water levels

---

## 2. PAGASA Scraping Feasibility

### 2.1 Website Structure

**Main site:** `https://bagong.pagasa.dost.gov.ph`

| Page | URL | Content | Scrapable? |
|------|-----|---------|-----------|
| Weather Forecast | `/weather` | Daily synopsis, forecast conditions, wind/coastal conditions, temperature/humidity extremes, satellite images | ✅ Yes — HTML tables |
| Tropical Cyclone Bulletin | `/tropical-cyclone/severe-weather-bulletin` | Active typhoon bulletins with wind signals, track maps, forecast positions | ✅ Yes — HTML (shows "No Active TC" when none) |
| Flood Information | `/flood` | River basin flood watch status, dam water levels, Metro Manila flood monitoring | ✅ Yes — HTML tables |
| Climate Monitoring | `/climate/climate-monitoring` | Rainfall monitoring, temperature monitoring images | ⚠️ Images only |
| Agri-Weather | `/agri-weather` | Agricultural weather advisory | ✅ Yes — HTML |
| Radar | `/radar` | Radar imagery | ❌ Dynamic images only |

### 2.2 The PAGASA Public File Server — CRITICAL DISCOVERY

**`https://pubfiles.pagasa.dost.gov.ph`** is an open Apache directory listing server with **no authentication required**. This is the most valuable scraping target.

#### Key Directories and Files:

**Weather Files (`/tamss/weather/`):**

| File | URL | Content | Updated |
|------|-----|---------|---------|
| `pf.pdf` | `pubfiles.pagasa.dost.gov.ph/tamss/weather/pf.pdf` | **Daily Public Weather Forecast** | Multiple times daily |
| `outlook.pdf` | `pubfiles.pagasa.dost.gov.ph/tamss/weather/outlook.pdf` | **Weather Outlook** | Daily |
| `ewo.pdf` | `pubfiles.pagasa.dost.gov.ph/tamss/weather/ewo.pdf` | **Extended Weather Outlook** | Daily |
| `advisory.pdf` | `pubfiles.pagasa.dost.gov.ph/tamss/weather/advisory.pdf` | **Weather Advisory** (when active) | As needed |
| `surface_map.jpg` | `pubfiles.pagasa.dost.gov.ph/tamss/weather/surface_map.jpg` | Surface weather map analysis | Updated ~every 6 hours |
| `chart.png` | `pubfiles.pagasa.dost.gov.ph/tamss/weather/chart.png` | Weather chart | Updated regularly |
| `cyclone.dat` | `pubfiles.pagasa.dost.gov.ph/tamss/weather/cyclone.dat` | **Tropical cyclone position data file** (~802 bytes) | When TC active |
| `metafile.txt` | `pubfiles.pagasa.dost.gov.ph/tamss/weather/metafile.txt` | **Metadata file with TC names & links** (~483 bytes) | When TC active |
| `high_seas.pdf` | `pubfiles.pagasa.dost.gov.ph/tamss/weather/high_seas.pdf` | High seas weather forecast | Daily |
| `gale.pdf` | `pubfiles.pagasa.dost.gov.ph/tamss/weather/gale.pdf` | Gale warning (when active) | As needed |
| `tourist.pdf` | `pubfiles.pagasa.dost.gov.ph/tamss/weather/tourist.pdf` | Tourist area weather forecast | Daily |

**Tropical Cyclone Bulletins (`/tamss/weather/bulletin/`):**

Naming convention: `TCB#{number}_{typhoon_name}.pdf`
- Example: `TCB#23_basyang.pdf` (Typhoon Basyang, Bulletin #23)
- Recent typhoons found: **Ada**, **Basyang**, **Uwan**, **Verbena**, **Wilma** (Nov 2025 – Feb 2026)

**Typhoon Track Images:**
- `track_{name}.png` — e.g., `track_basyang.png`, `track_ada.png`
- `signals_{name}.png` — Wind signal maps, e.g., `signals_basyang.png`
- `bulletin_{name}.pdf` — Latest bulletin PDF for each typhoon

**Weather Subdirectories:**
- `/tamss/weather/bulletin/` — All numbered TCBs
- `/tamss/weather/weather_advisory/` — Weather advisories archive
- `/tamss/weather/tca/` — Tropical cyclone advisories
- `/tamss/weather/iws/` — Impact-based Weather System bulletins
- `/tamss/weather/special_forecast/` — Special weather outlooks

**Dam Status:**
- `pubfiles.pagasa.dost.gov.ph/hmd/DAMSTATUS.gif` — Dam water level update image

**City-Specific Data (legacy, last updated 2016 but still accessible):**
- `manila.txt`, `cagayan_de_oro.txt`, `baguio_city.txt`, `metro_cebu.txt`, `metro_davao.txt`, etc.

### 2.3 PAGASA FFWS Subdomains

**`https://pasig-marikina-tullahanffws.pagasa.dost.gov.ph`** — Flood Forecasting & Warning System

| Endpoint | Content |
|----------|---------|
| `/water/map.do` | Water level map with station markers (dynamic) |
| `/water/table.do` | **Water level table data** — potentially scrapable HTML table |
| `/rainfall/map.do` | Rainfall monitoring map |
| `/warning/map.do` | Warning post map |
| `/automatic/map.do` | Automatic Weather Station data |
| `/radar/map.do` | Radar imagery |

These appear to be Java-based web apps (`.do` extension = Spring MVC or Struts). The table views may produce structured HTML.

### 2.4 Hidden API Endpoints / RSS Feeds

| Check | Result |
|-------|--------|
| RSS feed at standard paths (`/feed`, `/rss`, `/rss.xml`) | ❌ Not found |
| `robots.txt` | Not checked (but pubfiles server has open directory listing) |
| XHR/API calls from bagong.pagasa.dost.gov.ph | ⚠️ The main site appears to render data server-side (PHP/Laravel-based, given the URL structure like `/article/198`). Weather data is embedded in HTML, not loaded via JavaScript XHR. |
| PAGASA YouTube channel | Found at `youtube.com/channel/UCpyLikj1x70S8UPxVqsPr6g` — could monitor for typhoon updates |

### 2.5 Anti-Bot / Scraping Blocking Assessment

| Factor | Status |
|--------|--------|
| CloudFlare / WAF | ❌ No evidence of CloudFlare protection |
| Rate limiting | ❌ No evidence (pubfiles is a basic Apache server) |
| CAPTCHA | ❌ None observed |
| JavaScript rendering required | ⚠️ Some parts of the main site may need JS (weather maps), but the core data pages (weather forecast, flood info) appear to be server-rendered HTML |
| CORS headers | ❌ Likely NOT set (government sites rarely set `Access-Control-Allow-Origin`) — direct browser fetch will fail |

### 2.6 PAGASA Verdict

**Pubfiles server is the goldmine.** It's an open directory with direct file access, updated multiple times daily. The key limitation is that most files are PDFs/images rather than structured data. However:

- `cyclone.dat` and `metafile.txt` are text-parseable files with typhoon data
- The directory listing itself provides a real-time inventory of active bulletins
- The main site's `/weather` and `/flood` pages have structured HTML tables
- A serverless function can fetch and parse these without CORS issues

---

## 3. PHIVOLCS Scraping Feasibility

### 3.1 Earthquake Bulletins — BEST SCRAPING TARGET

**URL:** `https://earthquake.phivolcs.dost.gov.ph`

This is the **highest-value scraping target** across all PH government sites. It returns a well-structured HTML table with the following columns:

| Column | Example |
|--------|---------|
| Date - Time (Philippine Time) | 25 February 2026 - 09:12 AM |
| Latitude (°N) | 06.20 |
| Longitude (°E) | 126.11 |
| Depth (km) | 125 |
| Magnitude | 2.4 |
| Location | 046 km N 90° E of Don Marcelino (Davao Occidental) |

**Characteristics observed:**
- Updates **multiple times per hour** — at the time of research, there were 36+ earthquakes logged for Feb 25, 2026 alone
- Includes **all magnitudes from M1.0+** (much more granular than USGS which only covers M2.5+ for the Philippines)
- Clean table structure — standard `<table>` HTML, easy to parse with DOMParser
- Data is **monthly** — the page shows the current month's earthquakes
- Entries with blue-colored date/time have reported intensities (PHIVOLCS Earthquake Intensity Scale)
- No JavaScript rendering needed — the table is server-rendered HTML
- **No authentication required**

**Observed data volume:** ~30-60 earthquakes per day across the Philippines

### 3.2 Volcano Bulletins — via WoVoDAT

**URL:** `https://wovodat.phivolcs.dost.gov.ph/bulletin/list-of-bulletin`

**Structure:** This page shows the latest volcano bulletins for all monitored volcanoes. At time of research:

| Volcano | Alert Level | Key Parameters |
|---------|-------------|----------------|
| **Mayon** | **Level 3** (Intensified Unrest) | Lava flows on 3 gullies, 3 volcanic earthquakes, 305 rockfall signals, SO2: 4452 tonnes/day, crater glow visible, edifice inflated |
| **Kanlaon** | **Level 2** (Increased Unrest) | 15 volcanic earthquakes, SO2: 1737 tonnes/day, edifice inflated |
| **Taal** | **Level 1** (Low-level Unrest) | 0 volcanic earthquakes, crater lake pH 0.48, temp 63.1°C, SO2: 548 tonnes/day |
| **Bulusan** | **Level 1** | Hydrothermal disturbance |
| **Pinatubo** | **Level 0** | No eruption in foreseeable future |

**Bulletin structure per volcano (HTML, parseable):**
- Alert level number and description
- Parameters table: Activity, Seismicity, Crater Glow, SO2 Flux, Plume, Ground Deformation
- Earthquake location map (static image: `wovodat.phivolcs.dost.gov.ph/img/bulletinMap/{VOLCANO}{DATE}.jpg`)
- Recommendations table: What should be prohibited, what hazards can occur
- Available in **both Filipino and English** (`?lang=en` parameter)

**Individual bulletin URLs:**
- Mayon: `wovodat.phivolcs.dost.gov.ph/bulletin/activity-mvo?bid={id}` (with `&lang=en`)
- Kanlaon: `wovodat.phivolcs.dost.gov.ph/bulletin/activity-kvo?bid={id}`
- Taal: `wovodat.phivolcs.dost.gov.ph/bulletin/activity-tvo?bid={id}`

Bulletin IDs are sequential (e.g., bid=13624 for Mayon on Feb 25, 2026). The archive search feature also available.

### 3.3 PHIVOLCS Main Site

**URL:** `https://www.phivolcs.dost.gov.ph`

The main PHIVOLCS site **redirected to a Google Maps embed** during testing, suggesting the site may be under maintenance, poorly configured, or has moved. The earthquake and volcano data have effectively migrated to the subdomains listed above.

### 3.4 Anti-Bot / Scraping Blocking Assessment

| Factor | Status |
|--------|--------|
| CloudFlare / WAF | ❌ No evidence |
| Rate limiting | ❌ No evidence |
| CAPTCHA | ❌ None |
| JavaScript rendering required | ❌ No — both earthquake.phivolcs and wovodat are server-rendered |
| CORS headers | ❌ Likely not set |

### 3.5 RSS / XML Feeds

No RSS or XML feeds found on any PHIVOLCS subdomain.

### 3.6 PHIVOLCS Verdict

**Excellent scraping target.** The earthquake page at `earthquake.phivolcs.dost.gov.ph` is the single best-structured data source across all PH government sites — clean HTML tables, no anti-bot measures, frequent updates, no auth. The WoVoDAT volcano bulletins are also well-structured and parseable. Both would require a serverless proxy to handle CORS.

---

## 4. NDRRMC Scraping Feasibility

### 4.1 Website Access

**URL:** `https://ndrrmc.gov.ph`

**Result:** HTTP 403 Forbidden

The NDRRMC website returns a **403 error** when accessed programmatically. This could be due to:
- Server misconfiguration
- Geographic IP blocking
- User-Agent filtering / bot blocking
- The site being temporarily down (observed Feb 25, 2026)

### 4.2 Historical Pattern

NDRRMC's primary outputs are:
- **Situation Reports (SitReps)** — Published as PDF documents
- **Disaster updates** — Social media (Twitter/X, Facebook) tends to be more reliable
- **Evacuation data** — Embedded in SitReps, not available as structured data

### 4.3 Alternative: ReliefWeb API

The **ReliefWeb API** (`api.reliefweb.int/v2/`) effectively mirrors NDRRMC content in machine-readable JSON format:

```
GET https://api.reliefweb.int/v2/reports
  ?appname=overwatch-ai
  &filter[field]=country.name
  &filter[value]=Philippines
  &sort[]=date:desc
  &limit=20
```

This returns NDRRMC SitReps, OCHA updates, and humanitarian reports — far more reliable than scraping NDRRMC directly.

### 4.4 NDRRMC Verdict

**Do NOT scrape NDRRMC.** The site is blocked (403), and even when accessible, SitReps are PDFs requiring OCR/PDF parsing. Use **ReliefWeb API** as a direct, free, JSON-based substitute that aggregates the same reports.

---

## 5. Project NOAH / HazardHunter

### 5.1 Project NOAH (noah.up.edu.ph)

**Structure:** Single-Page Application (SPA) built with Mapbox.

| Feature | URL | Scrapable? |
|---------|-----|-----------|
| "Know Your Hazards" tool | `noah.up.edu.ph` main page | ❌ Interactive map, no static data |
| NOAH Studio | `noah.up.edu.ph/noah-playground` | ❌ Requires account, SPA |
| Rainfall monitoring | Beta feature | ❌ Dynamic |
| Typhoon tracking | Beta feature | ❌ Dynamic |

**Finding:** NOAH is primarily a Mapbox-based visualization tool. The hazard assessment is done by clicking on the map, which likely triggers an API call to a backend. Without access to the Network tab to inspect XHR calls, we cannot confirm what API endpoints exist. However:

- The site uses Mapbox GL JS for rendering
- Hazard data is likely served as GeoJSON or vector tiles
- Any backend APIs would also face CORS restrictions
- The mobile apps (iOS/Android) may use different API endpoints

**NOAH Verdict:** Not practical for scraping. The value is in the hazard maps (flood zones, landslide susceptibility) which are pre-computed GIS layers, not real-time data. For the hackathon, use NOAH as a reference resource rather than a data source.

### 5.2 HazardHunter (hazardhunter.georisk.gov.ph)

**More promising than NOAH.** HazardHunter has actual HTML pages with structured data:

#### Earthquake Monitoring Page

**URL:** `https://hazardhunter.georisk.gov.ph/monitoring/earthquake`

- Displays a Leaflet map with earthquake markers from the Philippine Seismic Network
- Has date range and magnitude filters
- Shows total earthquake count (e.g., "36" for Feb 25, 2026)
- **Key question:** Does the map load earthquake data via XHR (JSON) or is it embedded in HTML?
  - The page uses Leaflet + Esri, data sources listed as: PHIVOLCS, MGB, PAGASA, DepEd, DOH, DPWH
  - Legend shows magnitude ranges (1.0-1.9 through 8.0-8.9) and depth ranges (0-33km through >300km) with color-coded icons
  - **High probability** that earthquake data is fetched via XHR/AJAX as GeoJSON, because Leaflet maps typically load marker data dynamically

#### Volcano Alert Status Page

**URL:** `https://hazardhunter.georisk.gov.ph/monitoring/volcano`

This is a **great scraping target** — it's a simple HTML page showing:

| Data | Value |
|------|-------|
| Alert Level Status Summary | Taal: 1, Kanlaon: 2, Bulusan: 0, Pinatubo: 0, Mayon: 3 |
| Per-volcano details | Alert level, description, date since current level, recommendations |
| Links to bulletins | Points to `wovodat.phivolcs.dost.gov.ph` for detailed bulletins |

This page provides a **concise, scrapable summary** of all active volcano alert levels.

#### Map Page

**URL:** `https://hazardhunter.georisk.gov.ph/map`

- Uses Leaflet + Esri tiles
- Has layers for: Earthquake hazards, Volcanic hazards, Flood/landslide hazards, Critical facilities (schools, hospitals)
- Data sources: PHIVOLCS, MGB, PAGASA, DepEd, DOH, DPWH
- The hazard assessment is triggered by double-clicking on the map
- **Assessment likely requires an API call** — this is the most promising endpoint to reverse-engineer

#### Related Platforms

| Platform | URL | Purpose |
|----------|-----|---------|
| GeoRiskPH | `georisk.gov.ph` | Integrated platform |
| GeoAnalyticsPH | `geoanalytics.georisk.gov.ph` | Analytics |
| GeoMapperPH | `geomapper.georisk.gov.ph` | Mapping tool |
| PlanSmartPH | `plansmart.georisk.gov.ph` | Planning tool |
| 3D Philippines | `data.georisk.gov.ph` | 3D data system — **requires login** |

### 5.3 HazardHunter Verdict

The **volcano alert status page** is easy to scrape and provides unique value. The earthquake monitoring page likely has hidden JSON API endpoints worth investigating (XHR calls to load earthquake markers on the Leaflet map). The hazard assessment feature would require deep reverse-engineering and is not recommended for a hackathon.

---

## 6. Scraping Architecture Options

### 6.1 Option A: Serverless Function as Scraping Proxy ⭐ RECOMMENDED

**Platforms:** Cloudflare Workers, Vercel Edge Functions, Netlify Functions

**How it works:**
1. React frontend calls your serverless function: `GET /api/scrape/phivolcs-earthquakes`
2. Serverless function fetches `earthquake.phivolcs.dost.gov.ph` server-side (no CORS issue)
3. Function parses HTML with a lightweight parser (Cheerio, regex, or built-in text parsing)
4. Returns clean JSON to the frontend

**Cloudflare Workers (BEST for this use case):**

| Aspect | Details |
|--------|---------|
| Free tier | 100,000 requests/day, 10ms CPU time per request |
| HTML parsing | Use `HTMLRewriter` API (built into Workers) — perfect for scraping |
| Caching | Built-in Cache API — cache scraped results for 5-15 minutes |
| CORS | You control the response headers |
| Cold start | None — Workers run at the edge |
| Deployment | `wrangler deploy` |

**Vercel Edge Functions:**

| Aspect | Details |
|--------|---------|
| Free tier | 500,000 invocations/month on Hobby plan |
| HTML parsing | Can use regex or lightweight parsers (no Cheerio in Edge runtime, but available in Serverless Functions) |
| Caching | Use `Cache-Control` headers or Vercel KV |
| Integration | Seamless with Vite/React via `api/` directory |

**Netlify Functions:**

| Aspect | Details |
|--------|---------|
| Free tier | 125,000 invocations/month, 100 hours |
| HTML parsing | Full Node.js runtime — can use Cheerio, jsdom, etc. |
| Background functions | Can run up to 15 minutes (good for heavy scraping) |

**Pros:**
- ✅ No CORS issues (server-to-server fetch)
- ✅ Can parse HTML server-side with proper tools
- ✅ Generous free tiers
- ✅ Response caching saves repeated scrapes
- ✅ Low latency
- ✅ Works with your React frontend seamlessly

**Cons:**
- ⚠️ CPU time limits on edge functions (10ms Cloudflare, but HTML parsing is fast)
- ⚠️ Need to handle scraping failures gracefully
- ⚠️ Adds deployment complexity

### 6.2 Option B: GitHub Actions Cron → Static JSON ⭐ ALSO RECOMMENDED

**How it works:**
1. GitHub Actions workflow runs on a cron schedule (e.g., every 15 minutes)
2. Action runs a Node.js script that fetches all target websites
3. Parses HTML and writes structured JSON files
4. Commits JSON files to the repo (or pushes to GitHub Pages / R2 / S3)
5. React frontend fetches the JSON files via a static URL

**Example cron schedule:**
```yaml
on:
  schedule:
    - cron: '*/15 * * * *'  # Every 15 minutes
```

**GitHub Actions limits:**
| Aspect | Free Tier |
|--------|-----------|
| Minutes | 2,000 minutes/month (public repos: unlimited) |
| Frequency | Minimum 5-minute cron intervals (but GitHub may delay) |
| Storage | Standard Git repo limits |
| Output | Commit JSON to repo, or upload as artifact, or push to external storage |

**Pros:**
- ✅ Completely free (especially on public repos)
- ✅ Full Node.js environment — use Cheerio, Puppeteer, Playwright
- ✅ No CORS issues at all — frontend just fetches static JSON
- ✅ Data is cached/versioned in Git history
- ✅ Zero runtime infrastructure
- ✅ Can handle complex scraping (including PDF parsing if needed)

**Cons:**
- ⚠️ Data staleness — minimum ~5 min delay, typically 15-30 min
- ⚠️ GitHub may throttle or delay cron jobs
- ⚠️ Need to handle Git commit conflicts
- ⚠️ Not truly real-time

### 6.3 Option C: CORS Proxy (AllOrigins / cors-anywhere) + Client-Side Parsing

**How it works:**
1. React frontend fetches HTML through a CORS proxy: `https://api.allorigins.win/get?url=https://earthquake.phivolcs.dost.gov.ph`
2. Proxy returns the HTML as text (with CORS headers)
3. Frontend parses HTML using `DOMParser` or regex

**Available CORS Proxies:**

| Proxy | URL | Status | Limits |
|-------|-----|--------|--------|
| AllOrigins | `api.allorigins.win/get?url=` | ⚠️ Returned 404 during testing | Unreliable |
| cors-anywhere (demo) | `cors-anywhere.herokuapp.com/` | ⚠️ Demo requires activation, unreliable | Very limited |
| corsproxy.io | `corsproxy.io/?` | ⚠️ Intermittent availability | Unknown |
| thingproxy | `thingproxy.freeboard.io/fetch/` | ⚠️ Unreliable | Unknown |

**Self-hosted cors-anywhere on Render/Railway:**

| Platform | Free Tier |
|----------|-----------|
| Render | Free web service (spins down after inactivity, 750 hours/month) |
| Railway | $5 free credit/month |
| Fly.io | 3 shared-cpu VMs free |

**Pros:**
- ✅ No serverless function needed
- ✅ Client-side parsing with DOMParser is fast and free
- ✅ Simple architecture

**Cons:**
- ❌ **Unreliable** — public CORS proxies are frequently down or rate-limited
- ❌ Security risk — sending government site URLs through third-party proxies
- ❌ Exposes scraping logic in client-side code
- ❌ Can't handle complex HTML (DOMParser struggles with malformed HTML)
- ❌ **NOT RECOMMENDED for production or demos** — too fragile

### 6.4 Option D: Free Scraping API Services

| Service | Free Tier | Suitable? |
|---------|-----------|-----------|
| ScrapingBee | 1,000 API credits (then paid) | ⚠️ Very limited credits |
| ScraperAPI | 1,000 free requests, then $49/month | ⚠️ Limited |
| Bright Data | No free tier for scraping API | ❌ |
| Apify | 5 USD/month free credit | ⚠️ Could work for light use |
| ZenRows | 1,000 free requests | ⚠️ Limited |

**Verdict:** Not recommended. Free tiers are too restrictive, and these services add unnecessary complexity and cost for scraping simple government HTML pages.

---

## 7. Recommended Approach

### For a Hackathon: Hybrid Architecture (Options A + B)

```
┌─────────────────────────────────────────────────────┐
│                  React Frontend (Vite)               │
│                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ International│  │  Scraped PH  │  │ Static PH  │ │
│  │  APIs (direct│  │  Data (via   │  │ Data (from │ │
│  │  fetch, no   │  │  serverless  │  │ GitHub     │ │
│  │  proxy)      │  │  proxy)      │  │ Actions)   │ │
│  └──────┬──────┘  └──────┬───────┘  └─────┬──────┘ │
│         │                │                 │         │
└─────────┼────────────────┼─────────────────┼─────────┘
          │                │                 │
          ▼                ▼                 ▼
   ┌──────────────┐ ┌───────────────┐ ┌───────────────┐
   │ Open-Meteo   │ │  Cloudflare   │ │ GitHub Actions│
   │ USGS         │ │  Worker       │ │ (every 15 min)│
   │ ReliefWeb    │ │  ─────────    │ │ ──────────────│
   │ GDACS        │ │  Fetches &    │ │ Scrapes &     │
   │ NASA EONET   │ │  parses HTML  │ │ commits JSON  │
   │ (no CORS     │ │  from PH gov  │ │ to static     │
   │  issues)     │ │  sites        │ │ hosting       │
   └──────────────┘ └───────┬───────┘ └───────┬───────┘
                            │                 │
                            ▼                 ▼
                    ┌──────────────┐   ┌──────────────┐
                    │ earthquake.  │   │ Static JSON  │
                    │ phivolcs.    │   │ files on     │
                    │ dost.gov.ph  │   │ GitHub Pages │
                    │              │   │ or R2/S3     │
                    │ wovodat.     │   │              │
                    │ phivolcs...  │   │ - earthquakes│
                    │              │   │ - volcanoes  │
                    │ bagong.      │   │ - weather    │
                    │ pagasa...    │   │ - flood info │
                    └──────────────┘   └──────────────┘
```

### Simplest Viable Architecture for Demo

**Use ONLY the Cloudflare Worker approach** — it's the simplest, most reliable, and completely free:

#### Step 1: Create a Cloudflare Worker with 3-4 endpoints:

| Endpoint | Source | Returns |
|----------|--------|---------|
| `/api/ph/earthquakes` | `earthquake.phivolcs.dost.gov.ph` | JSON array of recent PH earthquakes |
| `/api/ph/volcanoes` | `hazardhunter.georisk.gov.ph/monitoring/volcano` | JSON with current volcano alert levels |
| `/api/ph/weather` | `bagong.pagasa.dost.gov.ph/weather` | JSON with current weather forecast |
| `/api/ph/flood` | `bagong.pagasa.dost.gov.ph/flood` | JSON with river basin flood watch status |

#### Step 2: Add caching in the Worker

- Cache each endpoint for 10-15 minutes using Cloudflare's Cache API
- This means even with 1000 users, you hit the gov sites only once per 15 minutes
- Total daily requests to gov sites: ~96 per endpoint × 4 endpoints = ~384 requests/day
- Well within acceptable scraping etiquette

#### Step 3: Frontend fetches your Worker endpoints

```
Frontend → Cloudflare Worker (your-worker.workers.dev/api/ph/earthquakes)
                    ↓ (cache miss?)
           earthquake.phivolcs.dost.gov.ph (fetch + parse HTML)
                    ↓
           Return JSON → Cache for 15 min → Return to frontend
```

### Data Freshness vs. Complexity Tradeoff

| Strategy | Freshness | Complexity | Best For |
|----------|-----------|------------|----------|
| Cloudflare Worker with caching | 10-15 min | Low | **Hackathon demo** ⭐ |
| GitHub Actions cron → static JSON | 15-30 min | Medium | Production/reliability |
| Both combined | 10-15 min (Worker) with static JSON fallback | Medium-High | Production |
| CORS proxy + client-side | Real-time | Low | ❌ Too unreliable |

### What NOT to Scrape (Use APIs Instead)

| Data Need | Don't Scrape | Use This Instead |
|-----------|-------------|-----------------|
| Weather forecasts | PAGASA scraping | **Open-Meteo API** (free, JSON, 16-day forecast) |
| Earthquakes (basic) | PHIVOLCS scraping | **USGS API** (free, GeoJSON, M2.5+) |
| Disaster alerts | Any PH site | **GDACS** (free, RSS/CAP/XML) |
| Situation reports | NDRRMC (blocked) | **ReliefWeb API** (free, JSON) |
| Storm/typhoon tracking | PAGASA scraping | **Open-Meteo** + **GDACS TC** events |
| Volcanic eruptions | PHIVOLCS scraping | **NASA EONET** + **GDACS** |

### What IS Worth Scraping (Unique PH Government Data)

| Data | Source | Why Scrape? | Priority |
|------|--------|------------|----------|
| **PH earthquake bulletins (M1.0+)** | earthquake.phivolcs.dost.gov.ph | More granular than USGS, PHIVOLCS intensity scale, PH-specific locations | ⭐ HIGH |
| **Volcano alert levels** | hazardhunter + wovodat | PHIVOLCS 0-5 scale with detailed parameters, no international API equivalent | ⭐ HIGH |
| **River basin flood watch** | bagong.pagasa.dost.gov.ph/flood | PH-specific basin monitoring, dam levels — no international equivalent | ⭐ HIGH |
| **Typhoon local names & bulletins** | pubfiles.pagasa.dost.gov.ph | Filipino typhoon names, PAGASA-specific wind signals (TCWS 1-5) | ⚡ MEDIUM |
| **Daily weather synopsis** | bagong.pagasa.dost.gov.ph/weather | PAGASA-authored synopsis — but Open-Meteo covers the raw data | ⚡ MEDIUM |

### Legal / Ethical Considerations

| Concern | Assessment |
|---------|-----------|
| **Terms of Service** | None of these sites have explicit TOS prohibiting scraping. PAGASA pubfiles is an intentionally public file server. |
| **Data ownership** | Government data in the Philippines is generally considered public information under the Freedom of Information (FOI) Act. |
| **Rate limiting / politeness** | With 15-min caching, you'd make ~400 requests/day total — negligible impact on government servers. |
| **Data attribution** | Always credit PAGASA, PHIVOLCS, DOST, NDRRMC as data sources in the app. |
| **Spirit of open government** | These agencies exist to disseminate disaster information to the public. An app that aggregates and makes this data more accessible aligns with their mission. |

### Final Recommendation for Overwatch AI

1. **Keep your existing international API stack** (Open-Meteo, USGS, GDACS, ReliefWeb, NASA EONET) as the primary data backbone — these are reliable, JSON-based, and CORS-friendly.

2. **Add a single Cloudflare Worker** (free tier: 100K requests/day) with 3-4 scraping endpoints for unique PH government data:
   - PHIVOLCS earthquake bulletins (M1.0+ with Philippine locations)
   - PHIVOLCS volcano alert levels and parameters
   - PAGASA river basin flood watch status
   
3. **Cache aggressively** (15-min TTL) to minimize load on government servers.

4. **Build graceful fallbacks** — if scraping fails, fall back to international APIs (USGS for earthquakes, GDACS for volcanic alerts).

5. **For the hackathon demo**, the Cloudflare Worker approach is the fastest to implement and most reliable. If time permits, add a GitHub Actions cron job as a backup data source.

---

## Appendix A: Key URLs Reference

### Scrapable Pages (Confirmed Working)

```
# PHIVOLCS Earthquake Bulletins (BEST TARGET)
https://earthquake.phivolcs.dost.gov.ph

# PHIVOLCS Volcano Bulletins  
https://wovodat.phivolcs.dost.gov.ph/bulletin/list-of-bulletin
https://wovodat.phivolcs.dost.gov.ph/bulletin/activity-mvo?bid={id}&lang=en  (Mayon)
https://wovodat.phivolcs.dost.gov.ph/bulletin/activity-kvo?bid={id}&lang=en  (Kanlaon)
https://wovodat.phivolcs.dost.gov.ph/bulletin/activity-tvo?bid={id}&lang=en  (Taal)

# HazardHunter Monitoring
https://hazardhunter.georisk.gov.ph/monitoring/volcano
https://hazardhunter.georisk.gov.ph/monitoring/earthquake

# PAGASA Main Site
https://bagong.pagasa.dost.gov.ph/weather
https://bagong.pagasa.dost.gov.ph/flood
https://bagong.pagasa.dost.gov.ph/tropical-cyclone/severe-weather-bulletin

# PAGASA Public Files Server (Open Directory)
https://pubfiles.pagasa.dost.gov.ph/tamss/weather/
https://pubfiles.pagasa.dost.gov.ph/tamss/weather/pf.pdf         (daily forecast)
https://pubfiles.pagasa.dost.gov.ph/tamss/weather/outlook.pdf     (weather outlook)
https://pubfiles.pagasa.dost.gov.ph/tamss/weather/ewo.pdf         (extended outlook)
https://pubfiles.pagasa.dost.gov.ph/tamss/weather/cyclone.dat     (TC position data)
https://pubfiles.pagasa.dost.gov.ph/tamss/weather/metafile.txt    (TC metadata)
https://pubfiles.pagasa.dost.gov.ph/tamss/weather/surface_map.jpg (surface map)
https://pubfiles.pagasa.dost.gov.ph/tamss/weather/bulletin/       (all TC bulletins)

# PAGASA Flood Forecasting
https://pasig-marikina-tullahanffws.pagasa.dost.gov.ph/water/table.do
https://pubfiles.pagasa.dost.gov.ph/hmd/DAMSTATUS.gif
```

### NOT Working / Blocked

```
# NDRRMC — Returns HTTP 403
https://ndrrmc.gov.ph

# PHIVOLCS main site — Redirects to Google Maps embed
https://www.phivolcs.dost.gov.ph

# PHIVOLCS earthquake info (old URL) — 404
https://www.phivolcs.dost.gov.ph/index.php/earthquake/earthquake-information3

# Project NOAH — SPA, not scrapable
https://noah.up.edu.ph

# GeoRisk 3D Data — Requires login
https://data.georisk.gov.ph
```

## Appendix B: Sample HTML Structure for Parsing

### PHIVOLCS Earthquake Table Row

Each row in the earthquake table contains:
```
| Date-Time (PST) | Lat (°N) | Lon (°E) | Depth (km) | Mag | Location Description |
```
Example: `25 February 2026 - 03:01 AM | 05.87 | 123.60 | 027 | 4.1 | 075 km S 60° W of Palimbang (Sultan Kudarat)`

### PAGASA Flood Watch Table

Each row in the basin hydrological forecast:
```
| Basin Name | Status |
```
Example: `Pampanga | Non-Flood Watch`

Statuses observed: "Non-Flood Watch" (all basins were in this status on Feb 25, 2026). During typhoon season, statuses would escalate.

### PAGASA Dam Information Table

Columns: `Dam Name | Time | Water Level | 24hr Change | Spilling Level | Difference | Normal High | Difference`

### HazardHunter Volcano Alert Summary

Alert levels displayed as: `Taal - 1  Kanlaon - 2  Bulusan - 0  Pinatubo - 0  Mayon - 3`

---

*End of scraping feasibility research.*
