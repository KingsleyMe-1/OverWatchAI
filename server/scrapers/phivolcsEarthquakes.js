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