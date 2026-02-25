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