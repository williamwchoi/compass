import { chromium } from 'playwright'

const routes = ['/', '/decide', '/reflect', '/foundations', '/inspiration']
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 })
let problems = 0

for (const r of routes) {
  await page.goto(`http://localhost:4174${r}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  const scrollW = await page.evaluate(() => document.documentElement.scrollWidth)
  const clientW = await page.evaluate(() => document.documentElement.clientWidth)
  const overflow = scrollW > clientW + 1
  // smallest font size among visible text inputs
  const smallInputs = await page.evaluate(() => {
    const els = [...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]), textarea, select')]
    return els.filter((e) => { const fs = parseFloat(getComputedStyle(e).fontSize); return fs && fs < 16 }).length
  })
  if (overflow || smallInputs) problems++
  console.log(`${r.padEnd(10)} scrollW=${scrollW} clientW=${clientW} ${overflow ? 'HORIZONTAL-SCROLL' : 'ok'} | sub16-inputs=${smallInputs}`)
  await page.screenshot({ path: `/tmp/compass${r === '/' ? '-today' : r.replace('/', '-')}.png`, fullPage: true })
}

await browser.close()
console.log(problems ? `\n${problems} page(s) with issues` : '\nAll pages clean at 375px ✓')
process.exit(problems ? 1 : 0)
