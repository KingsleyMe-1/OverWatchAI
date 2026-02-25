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