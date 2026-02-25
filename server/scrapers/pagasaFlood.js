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