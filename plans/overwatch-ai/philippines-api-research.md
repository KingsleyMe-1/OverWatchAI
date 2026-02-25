# OverWatch AI — Philippines API & Data Source Research

> **Purpose:** Comprehensive research document covering all FREE APIs and data sources for a Philippines-focused disaster preparedness app.  
> **Date:** February 2026  
> **Status:** Research only — no code.

---

## Table of Contents

1. [Philippines-Specific Disaster/Weather APIs](#1-philippines-specific-disasterweather-apis)
2. [International APIs Covering the Philippines](#2-international-apis-covering-the-philippines)
3. [OpenStreetMap / Overpass API for Philippine Facilities](#3-openstreetmap--overpass-api-for-philippine-facilities)
4. [Free LLM APIs (as of Early 2026)](#4-free-llm-apis-as-of-early-2026)
5. [Philippines Geocoding](#5-philippines-geocoding)
6. [Philippines Routing](#6-philippines-routing)
7. [Recommendations & Summary Table](#7-recommendations--summary-table)

---

## 1. Philippines-Specific Disaster/Weather APIs

### 1.1 PAGASA (Philippine Atmospheric, Geophysical and Astronomical Services Administration)

| Item | Details |
|------|---------|
| **Website** | https://pagasa.dost.gov.ph / https://bagong.pagasa.dost.gov.ph |
| **Public REST API?** | **NO** — No documented public JSON/REST API found |
| **Data Available** | Weather forecasts, tropical cyclone tracking/bulletins, flood advisories, climate data, agri-weather advisories, rainfall/temperature observations |
| **Access Method** | HTML scraping only. The "bagong" (new) site renders data in HTML pages. There is a public file server at `pubfiles.pagasa.dost.gov.ph` that may host downloadable bulletins and data files. |
| **Related Platforms** | **PANaHON** (panahon.gov.ph) — weather forecasts portal; **HazardHunter** (hazardhunter.georisk.gov.ph) — interactive hazard map tool |
| **Philippines Coverage** | Full — this IS the Philippine national weather agency |
| **Verdict** | ❌ Not usable as an API. Would require scraping, which is fragile and against most TOS. However, PAGASA's data products (typhoon tracking, rainfall warnings) are the gold standard for PH weather. Consider using Open-Meteo or OpenWeatherMap as a programmatic substitute, supplemented by GDACS for severe weather alerts. |

### 1.2 PHIVOLCS (Philippine Institute of Volcanology and Seismology)

| Item | Details |
|------|---------|
| **Website** | https://www.phivolcs.dost.gov.ph |
| **Public REST API?** | **NO** — website failed to return parseable content during research |
| **Data Available** | Earthquake bulletins, volcanic activity alerts, tsunami advisories |
| **Access Method** | Website only. Earthquake information page and main site returned no extractable API content. |
| **Philippines Coverage** | Full — official PH seismology/volcanology agency |
| **Verdict** | ❌ Not usable as an API. Use **USGS Earthquake API** as a substitute for Philippine earthquake data (USGS tracks all significant PH earthquakes). For volcanic activity, **NASA EONET** and **GDACS** can provide alerts. |

### 1.3 NDRRMC (National Disaster Risk Reduction and Management Council)

| Item | Details |
|------|---------|
| **Website** | https://ndrrmc.gov.ph |
| **Public REST API?** | **NO** — website failed to load meaningful content |
| **Data Available** | Disaster situation reports (SitReps), casualty/damage reports, evacuation center data |
| **Philippines Coverage** | Full — central disaster response coordinating body |
| **Verdict** | ❌ Not usable programmatically. SitReps are published as PDF documents. For disaster situation reports, use **ReliefWeb API** which aggregates NDRRMC reports in machine-readable format. |

### 1.4 Project NOAH (Nationwide Operational Assessment of Hazards)

| Item | Details |
|------|---------|
| **Website** | https://noah.up.edu.ph (UP Resilience Institute) |
| **Public REST API?** | **NO documented API** — but may have internal APIs powering the web map |
| **Data Available** | Flood hazard maps, landslide susceptibility maps, storm surge projections, "Know Your Hazards" tool |
| **Tools** | NOAH Studio (for researchers), HazardHunter (hazard lookup by location), mobile apps (iOS + Android) |
| **Map Technology** | Uses Mapbox-based map rendering |
| **Philippines Coverage** | Full — detailed barangay-level hazard data |
| **Verdict** | ⚠️ The web platform is useful for reference data but has no public API. The hazard maps would be extremely valuable if accessible programmatically. Consider checking if HazardHunter exposes any XHR/fetch requests that could be reverse-engineered (but this is fragile and potentially against TOS). |

### 1.5 Summary of PH Government APIs

**Key Finding:** None of the Philippine government agencies (PAGASA, PHIVOLCS, NDRRMC, Project NOAH) offer documented public REST APIs. All data is served through HTML websites, PDF reports, or proprietary web map platforms. This is a significant gap that means the app must rely on **international APIs** that cover the Philippines, supplemented by **scraping** only as a last resort.

---

## 2. International APIs Covering the Philippines

### 2.1 USGS Earthquake API ⭐ RECOMMENDED

| Item | Details |
|------|---------|
| **Base URL** | `https://earthquake.usgs.gov/fdsnws/event/1/query` |
| **Auth** | **None** — completely free, no API key needed |
| **Rate Limits** | Not explicitly documented but generous; real-time feeds update every minute |
| **Formats** | GeoJSON, CSV, XML, KML, QuakeML |
| **Philippines Relevance** | ✅ Excellent — Philippines is one of the most seismically active countries. USGS tracks all M2.5+ globally and all significant PH earthquakes. |

**Key Parameters for Philippines:**
```
?format=geojson
&minlatitude=4.5
&maxlatitude=21.5
&minlongitude=116
&maxlongitude=127
&minmagnitude=2.5
&orderby=time
&limit=100
```

**Alternative: Circle Search** (for radius around a Philippine city):
```
?format=geojson
&latitude=14.5995
&longitude=120.9842
&maxradiuskm=300
&minmagnitude=2.5
```

**Real-Time GeoJSON Feeds** (no query needed):
- All M1.0+ past hour: `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/1.0_hour.geojson`
- All M2.5+ past day: `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson`
- All M4.5+ past week: `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson`
- Significant past month: `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson`

**Additional Parameters:** `starttime`, `endtime`, `maxmagnitude`, `alertlevel` (green/yellow/orange/red), `limit` (max 20000), `orderby` (time/time-asc/magnitude/magnitude-asc)

**Response includes:** magnitude, location, depth, tsunami flag, felt reports, alert level, significance score, coordinates, and event URLs.

---

### 2.2 Open-Meteo ⭐ HIGHLY RECOMMENDED

| Item | Details |
|------|---------|
| **Base URL** | `https://api.open-meteo.com/v1/forecast` |
| **Auth** | **None** — completely free for non-commercial use, no API key |
| **Rate Limits** | < 10,000 requests/day (non-commercial) |
| **Formats** | JSON |
| **Philippines Relevance** | ✅ Excellent — full global coverage. Uses multiple weather models including JMA (Japan Meteorological Agency) which is highly accurate for Western Pacific typhoons. |

**Key Endpoint Examples for Philippines:**

**Weather Forecast (Manila):**
```
https://api.open-meteo.com/v1/forecast
  ?latitude=14.5995
  &longitude=120.9842
  &hourly=temperature_2m,relative_humidity_2m,precipitation,rain,weathercode,windspeed_10m,windgusts_10m,pressure_msl
  &daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,windgusts_10m_max
  &timezone=Asia/Manila
  &forecast_days=16
```

**Available Weather Variables (selection most relevant for disaster prep):**
- `temperature_2m`, `apparent_temperature` — heat advisories
- `precipitation`, `rain`, `showers` — flood risk
- `weathercode` — WMO weather condition codes
- `windspeed_10m`, `windgusts_10m`, `winddirection_10m` — typhoon/storm tracking
- `pressure_msl` — pressure drops indicate approaching typhoons
- `visibility` — for evacuation planning
- `uv_index` — outdoor safety
- `soil_moisture_0_to_7cm` — landslide susceptibility indicator
- `is_day` — for evacuation timing

**Additional Open-Meteo APIs:**

| API | Endpoint | Philippines Use |
|-----|----------|-----------------|
| **Flood API** | `https://flood-api.open-meteo.com/v1/flood` | River discharge forecasts — critical for PH flood-prone areas |
| **Marine API** | `https://marine-api.open-meteo.com/v1/marine` | Wave height, swell — useful for coastal PH communities |
| **Air Quality** | `https://air-quality-api.open-meteo.com/v1/air-quality` | PM2.5, PM10 — volcanic ash, fire smoke monitoring |
| **Historical** | `https://archive-api.open-meteo.com/v1/archive` | Past weather for risk pattern analysis |
| **Geocoding** | `https://geocoding-api.open-meteo.com/v1/search?name=Manila` | City name → coordinates |
| **Elevation** | `https://api.open-meteo.com/v1/elevation?latitude=14.5&longitude=120.9` | Flood zone / landslide risk assessment |

**Weather Models covering the Philippines:**
- GFS (NOAA, USA) — global, 0.25° resolution
- ECMWF IFS — global, highest accuracy
- JMA MSM/GSM — Japan Meteorological Agency, excellent for Western Pacific typhoon forecasting
- KMA (Korea Meteorological Administration) — good for East/Southeast Asia

**15-Minutely Data Available** — useful for real-time storm tracking

**Multi-coordinate Support** — can request multiple PH locations in one call (comma-separated lat/lon)

---

### 2.3 GDACS (Global Disaster Alert and Coordination System)

| Item | Details |
|------|---------|
| **Website** | https://www.gdacs.org |
| **Auth** | **None** — free, no API key |
| **Formats** | RSS/XML, KML, CAP (Common Alerting Protocol) |
| **Philippines Relevance** | ✅ Confirmed — during research, saw active Philippines M7.1 earthquake alert (Feb 22, 2026) on GDACS homepage |

**Feed URLs:**
```
RSS Feed:  https://www.gdacs.org/xml/rss.xml
CAP Feed:  https://www.gdacs.org/xml/gdacs_cap.xml  
KML Feed:  https://www.gdacs.org/xml/gdacs.kml
```

**API Endpoint (partial documentation):**
```
https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH
  ?eventlist=EQ,TC,FL,VO,DR,WF
  &country=PHL
  &fromDate=2025-01-01
  &toDate=2026-12-31
  &alertlevel=Green;Orange;Red
```
- `EQ` = Earthquake, `TC` = Tropical Cyclone, `FL` = Flood, `VO` = Volcano, `DR` = Drought, `WF` = Wildfire
- Country code for Philippines: `PHL`

**Event Types Tracked:**
- Earthquakes (alert levels based on population exposure)
- Tropical Cyclones (critical for typhoon-prone Philippines)
- Floods
- Volcanoes (Philippines has 24 active volcanoes)
- Drought
- Forest Fires

**Alert Levels:** Green (low), Orange (moderate), Red (severe) — based on population exposure and severity

**Verdict:** ⭐ Very valuable for **severe event alerting** — provides the kind of official disaster alerts that PAGASA/NDRRMC don't expose via API. The CAP feed format is an international standard for emergency alerts. Best used for real-time severe event monitoring rather than weather forecasting.

---

### 2.4 NASA EONET (Earth Observatory Natural Event Tracker) v3

| Item | Details |
|------|---------|
| **Base URL** | `https://eonet.gsfc.nasa.gov/api/v3/events` |
| **Auth** | **None** — free, no API key |
| **Rate Limits** | Not explicitly documented but generous |
| **Formats** | JSON, GeoJSON |
| **Philippines Relevance** | ✅ Good — tracks events globally, can filter by Philippines bbox |

**Key Endpoints:**

**All Events:**
```
https://eonet.gsfc.nasa.gov/api/v3/events
  ?status=open
  &bbox=116,4.5,127,21.5
  &limit=50
```

**GeoJSON Format (map-ready):**
```
https://eonet.gsfc.nasa.gov/api/v3/events/geojson
  ?status=open
  &bbox=116,4.5,127,21.5
```

**Categories Relevant to Philippines:**
| Category ID | Name | PH Relevance |
|-------------|------|-------------|
| `severeStorms` | Severe Storms | ⭐ Typhoons |
| `volcanoes` | Volcanoes | ⭐ Mayon, Taal, Pinatubo, etc. |
| `floods` | Floods | ⭐ Monsoon flooding |
| `landslides` | Landslides | ⚡ Secondary to typhoons/earthquakes |
| `wildfires` | Wildfires | Occasional |
| `earthquakes` | Earthquakes | (better covered by USGS) |

**Parameters:** `status` (open/closed/all), `start`/`end` (date range), `source`, `category`, `bbox` (lon1,lat2,lon2,lat1 format), `limit`, `days`

**Philippines Bounding Box:** `116,4.5,127,21.5` (West, South, East, North — note: different order from USGS)

**Verdict:** Good supplementary source. Particularly useful for tracking active wildfires, volcanic eruptions, and severe storms with satellite-detected event geometry. Less frequent updates than USGS for earthquakes.

---

### 2.5 ReliefWeb API

| Item | Details |
|------|---------|
| **Base URL** | `https://api.reliefweb.int/v2/` |
| **Auth** | No API key needed, but **must include** `appname` query parameter |
| **Rate Limits** | 1,000 calls/day, max 1,000 entries per call |
| **Formats** | JSON |
| **Philippines Relevance** | ✅ Excellent — Philippines is one of the most disaster-affected countries, heavily covered on ReliefWeb |

**Key Endpoints:**

**Disaster Reports for Philippines:**
```
https://api.reliefweb.int/v2/reports
  ?appname=overwatch-ai
  &filter[field]=country.name
  &filter[value]=Philippines
  &sort[]=date:desc
  &limit=20
```

**Active Disasters in Philippines:**
```
https://api.reliefweb.int/v2/disasters
  ?appname=overwatch-ai
  &filter[field]=country.name
  &filter[value]=Philippines
  &filter[field]=status
  &filter[value]=current
  &sort[]=date:desc
```

**Available Endpoints:** `/reports`, `/disasters`, `/jobs`, `/training`, `/countries`, `/sources`

**Useful Data:** Situation reports (often from NDRRMC/OCHA), disaster declarations, humanitarian updates, damage assessments, evacuation figures. This effectively gives you machine-readable access to the NDRRMC SitReps and other official PH disaster reports.

**Verdict:** ⭐ Essential for contextual disaster information. While not real-time sensor data, it provides the authoritative narrative reports, damage assessments, and humanitarian situation updates that the AI agents need for generating risk assessments and response recommendations.

---

### 2.6 OpenWeatherMap

| Item | Details |
|------|---------|
| **Base URL** | `https://api.openweathermap.org/data/2.5/` |
| **Auth** | **API key required** (free registration) |
| **Free Tier** | 60 calls/minute, 1,000,000 calls/month |
| **Philippines Relevance** | ✅ Full global coverage including Philippines |

**Free Tier Includes:**
- ✅ Current Weather API
- ✅ 3-hour Forecast (5 days)
- ✅ Air Pollution API
- ✅ Weather Maps (15 layers)
- ✅ Geocoding API
- ❌ Daily Forecast (16 days) — requires paid plan (30 GBP/mo minimum)
- ❌ Government Weather Alerts — requires One Call 3.0 (first 1,000 calls/day free, then 0.0012 GBP/call)
- ❌ Historical data — requires paid plan

**One Call 3.0 API (pay-per-call but has free tier):**
- First 1,000 API calls per day are FREE
- Includes: current weather (minutely updates), 1-minute precipitation forecast, 48-hour hourly forecast, 8-day daily forecast, historical data (47+ years), **government weather alerts**
- Each additional call: 0.0012 GBP

**Key Endpoint:**
```
https://api.openweathermap.org/data/2.5/weather
  ?lat=14.5995
  &lon=120.9842
  &appid=YOUR_API_KEY
  &units=metric
```

**Comparison with Open-Meteo:**
| Feature | OpenWeatherMap (Free) | Open-Meteo |
|---------|---------------------|------------|
| API Key Required | Yes | No |
| Free Calls | 1M/month | 10K/day (~300K/month) |
| Forecast Length | 5 days (3-hour) | 16 days (hourly) |
| Weather Alerts | Only in One Call 3.0 | No |
| Historical | Paid only | Free (archive API) |
| Flood Data | No | Yes (Flood API) |
| Marine | No | Yes |
| Air Quality | Yes | Yes |
| Models | Proprietary + NWP | GFS, ECMWF, JMA, KMA |

**Verdict:** OpenWeatherMap's free tier is generous in call volume but limited in features compared to Open-Meteo. The One Call 3.0 API's 1,000 free calls/day is useful if you need government weather alerts. **Recommendation:** Use Open-Meteo as primary weather source, OpenWeatherMap One Call 3.0 only if government alerts are needed.

---

## 3. OpenStreetMap / Overpass API for Philippine Facilities

### 3.1 Overpass API Overview

| Item | Details |
|------|---------|
| **Main Endpoint** | `https://overpass-api.de/api/interpreter` |
| **Alt Endpoints** | `https://maps.mail.ru/osm/tools/overpass/api/interpreter` (no rate limit), `https://overpass.private.coffee/api/interpreter` (no rate limit) |
| **Auth** | **None** — completely free |
| **Rate Limits** | < 10,000 queries/day and < 1 GB download/day on main instance (honor system) |
| **Formats** | JSON, XML, CSV |
| **License** | Data is ODbL (Open Database License) — must attribute OpenStreetMap |

### 3.2 Relevant OSM Tags for Disaster Preparedness

| Facility Type | OSM Tag | Notes |
|--------------|---------|-------|
| **Hospitals** | `amenity=hospital` | In-patient medical facilities with emergency services |
| **Clinics** | `amenity=clinic` | Medium-sized medical facility / health center |
| **Doctors** | `amenity=doctors` | Doctor's practice / surgery |
| **Pharmacies** | `amenity=pharmacy` | Medicine dispensing |
| **Fire Stations** | `amenity=fire_station` | Bureau of Fire Protection stations |
| **Police Stations** | `amenity=police` | PNP stations |
| **Schools** | `amenity=school` | Often used as evacuation centers in PH |
| **Universities** | `amenity=university` | Sometimes used as evacuation centers |
| **Community Centers** | `amenity=community_centre` | Barangay halls, multi-purpose halls |
| **Places of Worship** | `amenity=place_of_worship` | Churches often serve as emergency shelters |
| **Government Buildings** | `office=government` | Municipal/city halls, barangay halls |
| **Townhalls** | `amenity=townhall` | Municipal/barangay administration buildings |
| **Fuel Stations** | `amenity=fuel` | Emergency fuel supply points |
| **ATMs/Banks** | `amenity=atm`, `amenity=bank` | Emergency cash access |
| **Drinking Water** | `amenity=drinking_water` | Water access points |
| **Shelters** | `amenity=shelter` | Any kind of shelter |
| **Refugee Sites** | `amenity=refugee_site` | Designated displacement shelters |

### 3.3 Example Overpass Queries for Philippines

**All Hospitals in Metro Manila (within ~25km of Manila center):**
```
[out:json][timeout:30];
(
  node["amenity"="hospital"](around:25000,14.5995,120.9842);
  way["amenity"="hospital"](around:25000,14.5995,120.9842);
  relation["amenity"="hospital"](around:25000,14.5995,120.9842);
);
out center;
```

**All Emergency Facilities near a coordinate (hospitals, fire stations, police):**
```
[out:json][timeout:30];
(
  nwr["amenity"="hospital"](around:10000,14.5995,120.9842);
  nwr["amenity"="fire_station"](around:10000,14.5995,120.9842);
  nwr["amenity"="police"](around:10000,14.5995,120.9842);
);
out center;
```

**All Schools in a Philippine City (potential evacuation centers):**
```
[out:json][timeout:30];
area["name"="Quezon City"]["admin_level"="6"]->.searchArea;
(
  nwr["amenity"="school"](area.searchArea);
  nwr["amenity"="community_centre"](area.searchArea);
);
out center;
```

**All Hospitals in the Entire Philippines:**
```
[out:json][timeout:90];
area["ISO3166-1"="PH"]->.philippines;
(
  nwr["amenity"="hospital"](area.philippines);
);
out center;
```

**Emergency Essentials near a Point (hospitals, police, fire, pharmacies, fuel, banks):**
```
[out:json][timeout:45];
(
  nwr["amenity"~"hospital|clinic|fire_station|police|pharmacy|fuel|bank"](around:15000,14.5995,120.9842);
);
out center;
```

**How to Call from JavaScript:**
```javascript
const query = `[out:json][timeout:30];
(
  nwr["amenity"="hospital"](around:10000,${lat},${lon});
  nwr["amenity"="fire_station"](around:10000,${lat},${lon});
  nwr["amenity"="police"](around:10000,${lat},${lon});
);
out center;`;

const response = await fetch("https://overpass-api.de/api/interpreter", {
  method: "POST",
  body: "data=" + encodeURIComponent(query),
});
const data = await response.json();
// data.elements contains the results with lat, lon, tags (name, etc.)
```

**Response Format:**
Each element in `data.elements` contains:
- `type` (node/way/relation)
- `id` (OSM ID)
- `lat`, `lon` (for nodes) or `center.lat`, `center.lon` (for ways/relations with `out center`)
- `tags` — object with `name`, `amenity`, `phone`, `website`, `opening_hours`, `addr:street`, etc.

### 3.4 OSM Data Quality in the Philippines

The Philippines has an **active and strong OSM community**. Major mapping events (MapaThons) happen regularly, especially after typhoons. Metro Manila, Cebu, Davao, and other major cities are well-mapped. Rural areas have variable coverage. Post-disaster mapping (HOT — Humanitarian OpenStreetMap Team) significantly improves coverage after major events.

**Verdict:** ⭐ Overpass API is essential for this app. It provides the only free, programmable source of Philippine emergency facility locations (hospitals, police, fire stations, evacuation-suitable buildings). The `around` query is perfect for the "find nearest facilities" use case.

---

## 4. Free LLM APIs (as of Early 2026)

### 4.1 Google Gemini ⭐ RECOMMENDED

| Item | Details |
|------|---------|
| **API Endpoint** | `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` |
| **OpenAI-Compatible** | `https://generativelanguage.googleapis.com/v1beta/openai/` |
| **Auth** | API key (free, get from Google AI Studio) |
| **Free Tier** | ✅ Extremely generous |

**Free Models Available (Feb 2026):**

| Model | Free Input | Free Output | Context | Best For |
|-------|-----------|-------------|---------|----------|
| **Gemini 2.5 Flash** | ✅ Free | ✅ Free | 1M tokens | ⭐ Best balance of speed/quality for agents |
| Gemini 2.5 Flash-Lite | ✅ Free | ✅ Free | 1M tokens | Fastest, cost-effective |
| Gemini 2.5 Pro | ✅ Free | ✅ Free | 1M tokens | Highest quality reasoning |
| Gemini 2.0 Flash | ✅ Free | ✅ Free | 1M tokens | Previous gen, still excellent |
| Gemini 2.0 Flash-Lite | ✅ Free | ✅ Free | 1M tokens | Lightweight tasks |
| Gemini 3 Flash Preview | ✅ Free | ✅ Free | TBD | Latest preview |
| Gemma 3 | ✅ Free | ✅ Free | — | Open-weight model |
| Gemma 3n | ✅ Free | ✅ Free | — | Nano variant |

**Free Tier Rate Limits (Gemini 2.5 Flash):**
- 500 requests per day (RPD) — note: varies by model
- 15 requests per minute (RPM)
- 1,000,000 tokens per day (TPD)
- 250,000 tokens per minute (TPM)

**Additional Free Features:**
- Google Search grounding: 500 RPD on Flash models (allows the model to search the web for up-to-date disaster info)
- Content caching: free on some models
- Structured output (JSON mode): supported
- Function calling: supported

**Key Considerations:**
- ⚠️ Free tier usage data may be used to improve Google products
- ⚠️ Free tier has lower rate limits than paid; suitable for single-user or demo apps
- ✅ 1M token context window is massive — can include extensive disaster data in prompts

**Verdict:** ⭐ Best overall choice. Most generous free tier, excellent quality, supports structured JSON output needed for agent responses, and Google Search grounding can fetch real-time news about Philippine disasters.

---

### 4.2 Groq

| Item | Details |
|------|---------|
| **API Endpoint** | `https://api.groq.com/openai/v1/chat/completions` (OpenAI-compatible) |
| **Auth** | API key (free registration) |
| **Key Advantage** | Extremely fast inference (custom LPU hardware) |

**Free Tier Models & Limits:**

| Model | RPM | RPD | TPM | TPD |
|-------|-----|-----|-----|-----|
| `llama-3.3-70b-versatile` | 30 | 1,000 | 12,000 | 100,000 |
| `llama-3.1-8b-instant` | 30 | 14,400 | 6,000 | 500,000 |
| `meta-llama/llama-4-scout` | 30 | 1,000 | 30,000 | 500,000 |
| `meta-llama/llama-4-maverick` | 30 | 1,000 | 6,000 | 500,000 |
| `qwen/qwen3-32b` | 60 | 1,000 | 6,000 | 500,000 |
| `moonshotai/kimi-k2-instruct` | 60 | 1,000 | 10,000 | 300,000 |

**Audio Models (Whisper):** Also available — could transcribe emergency broadcasts

**Verdict:** ⭐ Excellent as a **secondary/fallback** LLM. Ultra-fast responses are great for user-facing interactions. The 1,000 RPD limit on the best models (70b, Scout, Maverick) is restricting for production but fine for demos. Llama 3.1 8b has a generous 14,400 RPD for lighter tasks. OpenAI-compatible API makes it easy to swap between providers.

---

### 4.3 Cohere

| Item | Details |
|------|---------|
| **API Endpoint** | `https://api.cohere.ai/v2/chat` |
| **Auth** | API key (trial key — free registration) |
| **Free Tier** | Trial keys: 1,000 API calls/month, 20 req/min for Chat |

**Available Models:**
- Command A (latest, best quality)
- Command A Reasoning (chain-of-thought)
- Command A Vision (multimodal)
- Command A Translate (useful for Filipino/Tagalog translation)
- Command R+ (previous gen, still good)
- Command R7B (lightweight)

**Notable Feature:** Command A Translate could be useful for translating disaster information into Filipino/Tagalog, Cebuano, or Ilocano.

**Verdict:** Limited free tier (1,000 calls/month). The translation capability is unique and potentially valuable for a PH-focused app, but the API call limit is restrictive.

---

### 4.4 Mistral (La Plateforme)

| Item | Details |
|------|---------|
| **API Endpoint** | `https://api.mistral.ai/v1/chat/completions` |
| **Auth** | API key |
| **Free Tier** | Has open-weight models available, but explicit free API tier details are unclear |

**Open Models on La Plateforme:**
- Mistral Large 3 (v25.12)
- Mistral Small 3.2 (v25.06)
- Ministral 3 14B/8B/3B (v25.12)
- Magistral Small 1.2 (v25.09)

**Verdict:** ⚠️ Unclear if there's a meaningful free API tier. Open-weight models are available but whether La Plateforme offers free inference wasn't confirmed. Better to access Mistral models through **Groq** or **HuggingFace** free tiers.

---

### 4.5 OpenRouter

| Item | Details |
|------|---------|
| **API Endpoint** | `https://openrouter.ai/api/v1/chat/completions` (OpenAI-compatible) |
| **Auth** | API key |
| **Free Models** | Models with `:free` suffix in model ID |
| **Rate Limits** | 20 RPM; 50 RPD (or 1,000 RPD if you've purchased ≥$10 in credits) |

**How Free Models Work:**
- Some open-weight models are served free (e.g., `meta-llama/llama-3.1-8b-instruct:free`)
- Free models have the 20 RPM, 50 RPD limit
- If credit balance goes negative, even free models are blocked
- 628+ models available (most paid, some free)

**Verdict:** ⚠️ The 50 RPD limit on the truly-free tier is very restrictive. Better to use Gemini or Groq directly. OpenRouter is more useful as a paid aggregator with model switching.

---

### 4.6 HuggingFace Inference API

| Item | Details |
|------|---------|
| **API Endpoint** | `https://router.huggingface.co/v1/chat/completions` (OpenAI-compatible) |
| **Auth** | HuggingFace API token (free registration) |
| **Free Tier** | "Generous free tier" (exact numbers not published) |
| **Providers** | Routes through Cerebras, Cohere, Groq, Together, SambaNova, etc. |

**Features:**
- Access to many open-source models (Llama, Mistral, Qwen, etc.)
- OpenAI-compatible endpoint
- Auto-routes to fastest available provider
- Text generation, image gen, embeddings, and more
- PRO subscription ($9/mo) gives additional credits

**Verdict:** Good option for accessing multiple models through one endpoint. Free tier is generous but unspecified, making it hard to plan around.

---

### 4.7 Cloudflare Workers AI

| Item | Details |
|------|---------|
| **API Endpoint** | `https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{model}` |
| **Auth** | Cloudflare API token (free account) |
| **Free Tier** | **10,000 Neurons per day** |
| **Paid** | $0.011 per 1,000 Neurons beyond free |

**Available Models (50+ open-source):**
- Llama 3.3 70B, Llama 4 Scout
- Qwen3 variants
- DeepSeek R1 (distilled)
- Gemma 3, Mistral models
- GPT-OSS models

**Neuron Costs Vary by Model:**
- Smaller models (8B params) ≈ fewer neurons per request
- Larger models (70B+) ≈ more neurons per request
- 10,000 neurons/day could mean anywhere from ~50 to ~500+ requests depending on model and prompt size

**Verdict:** Interesting option if already using Cloudflare infrastructure. The neuron-based pricing makes it hard to predict exact free usage. Best for apps already deployed on Cloudflare Workers.

---

### 4.8 Together AI

| Item | Details |
|------|---------|
| **API Endpoint** | `https://api.together.xyz/v1/chat/completions` (OpenAI-compatible) |
| **Auth** | API key |
| **Free Credits** | $1 in free credits for new accounts (unconfirmed from page) |
| **Pricing** | Per-token, varies by model (paid after credits) |

**Key Models:**
- Llama 4 Maverick/Scout
- DeepSeek V3.1, R1
- Qwen3 variants (235B, 32B, 30B, 8B)
- GLM-5, Gemma 3, Mistral

**Verdict:** ⚠️ No ongoing free tier — just one-time signup credits. Not suitable for sustained free usage. Use Groq or Gemini instead.

---

### 4.9 LLM Recommendation Summary

| Provider | Recommended For | Free Limit | Quality |
|----------|----------------|------------|---------|
| **Google Gemini** ⭐ | Primary LLM for all agents | 500 RPD, 1M tokens/day | Excellent |
| **Groq** ⭐ | Fallback / fast responses | 1K-14.4K RPD varies | Very Good |
| **HuggingFace** | Third fallback | "Generous" (unspecified) | Good |
| Cohere | Translation (Filipino) | 1,000 calls/month | Good |
| Cloudflare | CF-deployed apps only | 10K neurons/day | Good |
| OpenRouter | Not recommended (50 RPD) | 50 RPD free | Varies |
| Together AI | Not recommended (no free tier) | $1 credits only | Varies |
| Mistral | Use via Groq/HF instead | Unknown | Good |

**Strategy:** Use Gemini 2.5 Flash as primary → Groq Llama 4 Scout as fallback → HuggingFace as emergency third option.

---

## 5. Philippines Geocoding

### 5.1 Nominatim (OpenStreetMap) ⭐ RECOMMENDED

| Item | Details |
|------|---------|
| **Search Endpoint** | `https://nominatim.openstreetmap.org/search?q={query}&format=jsonv2` |
| **Reverse Endpoint** | `https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=jsonv2` |
| **Auth** | **None** — but must include `User-Agent` header and ideally `email` parameter |
| **Rate Limits** | **1 request per second** (strict) |
| **Philippines Relevance** | ✅ Good — OSM has strong coverage of Philippine places |

**Key Parameters:**
- `q` — Free-form query (e.g., "Barangay Ermita, Manila, Philippines")
- `countrycodes=ph` — **Filter results to Philippines only**
- `format=jsonv2` — JSON output (also: json, geojson, geocodejson, xml)
- `addressdetails=1` — Include address breakdown
- `limit=10` — Max results (max 40)
- `viewbox=116,21.5,127,4.5` — Boost results within Philippines bbox
- `bounded=1` — Hard-filter to viewbox area only
- `layer=address,poi` — Filter by category

**Structured Query (for precise address lookup):**
```
https://nominatim.openstreetmap.org/search
  ?city=Manila
  &country=Philippines
  &format=jsonv2
  &addressdetails=1
```

**Philippines-Specific Geocoding Examples:**
```
# Barangay-level
?q=Barangay+Ermita,+Manila,+Philippines&format=jsonv2&countrycodes=ph

# City/Municipality
?q=Tacloban+City,+Leyte,+Philippines&format=jsonv2&countrycodes=ph

# Province
?q=Cebu+Province,+Philippines&format=jsonv2&countrycodes=ph

# Landmark
?q=SM+Mall+of+Asia,+Pasay,+Philippines&format=jsonv2&countrycodes=ph
```

**Reverse Geocoding (coordinates → address):**
```
https://nominatim.openstreetmap.org/reverse
  ?lat=14.5995
  &lon=120.9842
  &format=jsonv2
  &addressdetails=1
  &accept-language=en
```

**Response includes:** `lat`, `lon`, `display_name`, `address` (breakdown with suburb, city, state, country), `boundingbox`, `osm_type`, `osm_id`

**Philippine Address Hierarchy in Nominatim:**
- Country → Region → Province → City/Municipality → Barangay → Street → House Number
- Barangay names are generally well-covered in Metro Manila and major cities
- Rural barangay coverage varies

**Special Phrases Support:** Can search "hospital in Manila" or "school near Quezon City" — Nominatim translates these to OSM tag queries

**Important Usage Rules:**
- ⚠️ Maximum 1 request per second (hard requirement)
- ⚠️ Must set a custom `User-Agent` header (e.g., `OverwatchAI/1.0`)
- ⚠️ Provide `email` parameter for heavy usage
- ⚠️ Do not use for autocomplete (too slow at 1 req/sec) — use Open-Meteo Geocoding API instead for search-as-you-type

**Verdict:** ⭐ Best free geocoding option for the Philippines. The 1 req/sec limit means it's best for deliberate lookups, not autocomplete. Pair with Open-Meteo Geocoding for search-as-you-type city search, and Nominatim for precise address/reverse geocoding.

---

### 5.2 Open-Meteo Geocoding API (search-as-you-type)

| Item | Details |
|------|---------|
| **Endpoint** | `https://geocoding-api.open-meteo.com/v1/search?name={query}` |
| **Auth** | None |
| **Rate Limits** | Same as Open-Meteo (< 10,000/day) |
| **Best For** | Fast city/place search for autocomplete |

**Example:**
```
https://geocoding-api.open-meteo.com/v1/search
  ?name=Cebu
  &count=10
  &language=en
  &format=json
```

Returns: name, latitude, longitude, elevation, country, country_code, timezone, population, admin levels

**Verdict:** Use this for the search-as-you-type location input (fast, no rate limit concerns). Then use Nominatim for precise reverse geocoding after the user selects a location.

---

## 6. Philippines Routing

### 6.1 OSRM (Open Source Routing Machine) ⭐ RECOMMENDED

| Item | Details |
|------|---------|
| **Demo Server** | `https://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}` |
| **FOSSGIS Instance** | `https://routing.openstreetmap.de/routed-car/route/v1/driving/{coords}` |
| **Auth** | **None** — free, no API key |
| **Rate Limits** | Not documented but demo server is for light use only |
| **Data Source** | OpenStreetMap road network |
| **Profiles** | `driving`, `bicycle`, `walking` (FOSSGIS instance), `driving` only (demo server) |
| **Philippines Coverage** | ✅ Confirmed working — tested Manila to Makati routing successfully |

**Route Request:**
```
GET https://router.project-osrm.org/route/v1/driving/120.9842,14.5995;121.0244,14.5547
  ?overview=full
  &geometries=geojson
  &steps=true
  &alternatives=true
```

**Parameters:**
- Coordinates: `{lon},{lat};{lon},{lat}` (longitude first!)
- `overview` — `full` (detailed geometry), `simplified`, `false`
- `geometries` — `geojson` (recommended for Leaflet), `polyline`, `polyline6`
- `steps` — `true` for turn-by-turn directions
- `alternatives` — `true` for alternative routes
- `annotations` — `duration,distance,speed` for per-segment details

**Available Services:**
| Service | Endpoint | Use Case |
|---------|----------|----------|
| **Route** | `/route/v1/{profile}/{coords}` | Point-to-point routing |
| **Nearest** | `/nearest/v1/{profile}/{lon},{lat}` | Snap to nearest road |
| **Table** | `/table/v1/{profile}/{coords}` | Distance matrix (multiple origins/destinations) |
| **Match** | `/match/v1/{profile}/{coords}` | Map matching GPS traces |
| **Trip** | `/trip/v1/{profile}/{coords}` | Traveling salesman (visit all points optimally) |
| **Tile** | `/tile/v1/{profile}/tile({x},{y},{z}).mvt` | Vector tile with routing data |

**Table API (for finding nearest facility):**
The Table API is particularly useful for evacuation planning — given a user location and multiple hospitals/shelters, it returns a distance/duration matrix:
```
GET /table/v1/driving/120.9842,14.5995;121.0244,14.5547;121.0,14.5;120.95,14.6
  ?sources=0
  &destinations=1;2;3
  &annotations=duration,distance
```
This returns the duration and distance from the user (source 0) to each destination, enabling "find nearest hospital" functionality.

**Response Format:**
```json
{
  "code": "Ok",
  "routes": [{
    "legs": [{
      "steps": [...],
      "duration": 805.1,    // seconds
      "distance": 10244.8   // meters
    }],
    "geometry": { ... },     // GeoJSON when geometries=geojson
    "duration": 805.1,
    "distance": 10244.8
  }]
}
```

**Philippine-Specific Notes:**
- ✅ Successfully routed Manila (Ermita) to Makati: 10.2 km, ~13 minutes
- ✅ Philippine road network in OSM is well-mapped in Metro Manila and major cities
- ⚠️ Rural/provincial roads may have gaps or inaccuracies
- ⚠️ Demo server is for demo purposes — for production, consider self-hosting OSRM or using the FOSSGIS instance
- ⚠️ Does NOT account for real-time traffic, road closures, or flood-blocked roads

**FOSSGIS Public Instance (more reliable for production):**
```
https://routing.openstreetmap.de/routed-car/route/v1/driving/120.9842,14.5995;121.0244,14.5547
  ?overview=full
  &geometries=geojson
  &steps=true
```

Available profiles on FOSSGIS:
- `routed-car` — driving
- `routed-bike` — cycling  
- `routed-foot` — walking

**Verdict:** ⭐ Best free routing option. Confirmed working for Philippine routes. The Table API is especially useful for multi-destination distance matrix (finding nearest evacuation facilities). Use the FOSSGIS instance for more reliability than the demo server.

---

### 6.2 Valhalla (Alternative)

| Item | Details |
|------|---------|
| **Type** | Open-source routing engine (like OSRM but newer) |
| **Public Instance** | No major free public API instance |
| **Self-Hosted** | Can be self-hosted with OSM Philippine data extracts from Geofabrik |
| **Advantages** | Better handling of turn restrictions, isochrone generation (reachability maps) |

**Verdict:** Only useful if self-hosting. OSRM's public instances are the practical choice.

---

## 7. Recommendations & Summary Table

### 7.1 Recommended API Stack for OverWatch AI (Philippines)

| Function | Primary API | Backup API | Auth | Notes |
|----------|------------|------------|------|-------|
| **Weather Forecasts** | Open-Meteo | OpenWeatherMap One Call 3.0 | None / API key | Open-Meteo has 16-day forecast, flood API, marine API |
| **Earthquake Data** | USGS Earthquake API | — | None | Filter by PH bounding box: lat 4.5-21.5, lon 116-127 |
| **Severe Disaster Alerts** | GDACS (RSS/CAP) | NASA EONET | None | GDACS CAP feed for typhoon/flood/volcano alerts |
| **Disaster Reports** | ReliefWeb API | — | None (appname param) | Machine-readable NDRRMC SitReps |
| **Active Natural Events** | NASA EONET v3 | — | None | Satellite-detected storms, volcanoes, fires |
| **Emergency Facilities** | Overpass API (OSM) | — | None | Hospitals, fire stations, police, schools |
| **Geocoding** | Nominatim (precise) + Open-Meteo Geocoding (search) | — | None | Nominatim for address, Open-Meteo for autocomplete |
| **Routing** | OSRM (FOSSGIS instance) | — | None | Route + Table API for evacuation |
| **Elevation** | Open-Meteo Elevation API | — | None | Flood zone assessment |
| **AI/LLM** | Google Gemini 2.5 Flash | Groq (Llama 4 Scout) | API key | Gemini primary, Groq fallback |
| **Maps** | OpenStreetMap tiles + Leaflet | — | None | Free, no API key |

### 7.2 Key Architecture Decisions

1. **No scraping** — All recommended APIs have proper endpoints. Avoids the fragility of scraping PAGASA/PHIVOLCS websites.

2. **Multi-source disaster data** — Since no single PH government API exists, combine USGS (earthquakes) + GDACS (typhoons/floods/volcanoes) + NASA EONET (active events) + ReliefWeb (situation reports) + Open-Meteo (weather forecasts) for comprehensive disaster awareness.

3. **LLM fallback chain** — Gemini → Groq → HuggingFace. All three have OpenAI-compatible endpoints, making provider switching trivial.

4. **Overpass for facilities** — Only programmatic way to get Philippine hospital/police/fire station locations. Cache results aggressively (facilities don't change often).

5. **OSRM Table API** — For "find nearest evacuation point" — send user location + all nearby facilities from Overpass, get a distance/duration matrix back, sort by nearest.

6. **Open-Meteo over OpenWeatherMap** — More data (flood API, marine, 16-day forecast, historical), no API key needed, excellent model coverage for Western Pacific.

### 7.3 Rate Limit Budget (Daily)

| API | Free Daily Limit | Expected Usage | Headroom |
|-----|-------------------|----------------|----------|
| Open-Meteo | 10,000 requests | ~100-200/user | 50-100 users/day |
| USGS Earthquake | Unlimited (feeds) | ~10/user | Unlimited |
| GDACS | Unlimited (feeds) | ~5/user | Unlimited |
| NASA EONET | Generous | ~5/user | Plenty |
| ReliefWeb | 1,000/day | ~5/user | ~200 users/day |
| Overpass API | 10,000/day | ~10/user | ~1,000 users/day |
| Nominatim | 86,400 (1/sec) | ~5/user | ~17,000 users/day |
| OSRM | Generous | ~10/user | Plenty |
| Gemini | 500 RPD / 1M tokens | ~20/user (4 agents × 5 calls) | ~25 users/day |
| Groq (fallback) | 1,000 RPD | ~5/user (fallback only) | ~200 users/day |

**Bottleneck:** The LLM is the tightest constraint. Gemini's 500 RPD supports ~25 active users/day. Strategies to improve:
- Cache agent results for same location/risk combination
- Use Gemini 2.5 Flash-Lite for simpler agent tasks (likely higher RPD)
- Fall back to Groq for some agents
- Spread across multiple Gemini API keys (multiple Google accounts)

### 7.4 APIs Replaced from Original Plan

The original `plan.md` referenced US-only APIs. Here are the replacements:

| Original (US-only) | Replacement (Philippines) | Reason |
|--------------------|--------------------------|--------|
| weather.gov NWS API | Open-Meteo + GDACS | weather.gov is US-only |
| FEMA Disasters API | ReliefWeb API | FEMA is US-only; ReliefWeb aggregates PH disaster reports |
| — (no equivalent) | Overpass API | Need PH facility data |
| — (no equivalent) | GDACS CAP/RSS feeds | Need PH severe weather/disaster alerts |

APIs that remain the same:
- ✅ USGS Earthquake API — works globally
- ✅ NASA EONET — works globally
- ✅ Nominatim — works globally
- ✅ OSRM — works globally (confirmed for Philippines)
- ✅ Google Gemini — works globally
- ✅ OpenStreetMap Tiles — works globally
