import cors from 'cors'
import express from 'express'
import { getCached, setCached } from './cache.js'
import { scrapePagasaFlood } from './scrapers/pagasaFlood.js'
import { scrapePagasaWeather } from './scrapers/pagasaWeather.js'
import { scrapePhivolcsEarthquakes } from './scrapers/phivolcsEarthquakes.js'
import { scrapePhivolcsVolcanoes } from './scrapers/phivolcsVolcanoes.js'

const app = express()
const port = process.env.PORT || 3001

app.use(
  cors({
    origin: [
      'http://localhost:5173',
      /\.vercel\.app$/,
    ],
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

// Proxy for GDACS RSS (avoids browser CORS issues)
app.get('/api/proxy/gdacs/rss', async (req, res) => {
  try {
    const cached = getCached('gdacs-rss')
    if (cached) {
      res.set('Content-Type', 'application/xml')
      return res.send(cached)
    }
    const response = await fetch('https://www.gdacs.org/xml/rss.xml')
    if (!response.ok) throw new Error(`GDACS returned ${response.status}`)
    const text = await response.text()
    setCached('gdacs-rss', text)
    res.set('Content-Type', 'application/xml')
    return res.send(text)
  } catch (error) {
    return res.status(502).json({ ok: false, error: error.message })
  }
})

// Proxy for ReliefWeb API (uses POST method which is more reliable)
app.get('/api/proxy/reliefweb/reports', async (req, res) => {
  try {
    const cached = getCached('reliefweb-reports')
    if (cached) {
      return res.json(cached)
    }
    const url = 'https://api.reliefweb.int/v1/reports?appname=overwatch-ai'
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'OverwatchAI/1.0 (disaster-monitoring; https://github.com/overwatch-ai)',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        appname: 'overwatch-ai',
        filter: {
          field: 'country.name',
          value: ['Philippines'],
        },
        sort: ['date:desc'],
        limit: 10,
        fields: {
          include: ['title', 'date.created', 'url', 'source', 'country', 'disaster_type'],
        },
      }),
    })
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      console.error(`[ReliefWeb] ${response.status} ${response.statusText}: ${body}`)
      throw new Error(`ReliefWeb returned ${response.status}`)
    }
    const data = await response.json()
    setCached('reliefweb-reports', data)
    return res.json(data)
  } catch (error) {
    console.error('[ReliefWeb proxy error]', error.message)
    return res.status(502).json({ ok: false, error: error.message })
  }
})

app.listen(port, () => {
  console.log(`Scraper backend running on http://localhost:${port}`)
})