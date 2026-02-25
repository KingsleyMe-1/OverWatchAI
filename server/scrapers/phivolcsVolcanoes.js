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