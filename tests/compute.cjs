// 需安装 Playwright；TEST_URL 可指向任意静态预览服务器。
const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const base = process.env.TEST_URL || 'http://127.0.0.1:8766/'

;(async () => {
  const browser = await chromium.launch({ channel: 'chrome' })
  try {
    let expectedPillars
    for (const timezoneId of ['UTC', 'America/Los_Angeles', 'Asia/Shanghai']) {
      const context = await browser.newContext({ timezoneId, viewport: { width: 390, height: 800 } })
      await context.addInitScript(() => {
        Date.now = () => Date.UTC(2026, 9, 25, 6, 30, 0)
        // 任何写入都使测试失败；不只核对某个历史 key。
        Storage.prototype.setItem = () => { throw new Error('禁止写入存储') }
        Storage.prototype.removeItem = () => { throw new Error('禁止改动存储') }
        Storage.prototype.clear = () => { throw new Error('禁止清空存储') }
        indexedDB.open = () => { throw new Error('禁止打开数据库') }
        navigator.geolocation.getCurrentPosition = () => { throw new Error('禁止定位') }
      })
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(new URL('compute.html?type=meihua&numbers=1,2,3&date=2026-09-21&time=23:30&timezone=Asia/Shanghai&question=test', base).href)
      await page.waitForSelector('html[data-state="ready"]')
      const result = await page.evaluate(() => window.pblossomResult)
      assert.equal(result.ok, true)
      assert.equal(result.input.calculation.date + ' ' + result.input.calculation.time, '2026-09-21 23:30:00')
      assert.deepEqual(result.data.四柱.split(' ').slice(2), ['己亥', '甲子'])
      assert.equal(result.data.本卦, '天泽履')
      assert.equal(result.data.动爻, 3)
      assert.equal(result.input.question, 'test')
      assert.equal(result.data.id, undefined)
      assert.equal(result.input.timezone, 'Asia/Shanghai')
      if (expectedPillars) assert.deepEqual(result.data.四柱.split(' '), expectedPillars)
      expectedPillars = result.data.四柱.split(' ')
      const checks = await page.evaluate(() => {
        const calc = PBlossomCompute.calculate
        const time = { date: '2026-09-21', time: '23:30', timezone: 'Asia/Shanghai' }
        return {
          calendar: calc({ type: 'calendar', ...time }),
          liuren: calc({ type: 'liuren', ...time, longitude: 120.86, nobleMode: 'night', hourBranch: '子' }),
          fixedNoon: calc({ type: 'calendar', date: '2026-10-25' }),
          historical: calc({ type: 'meihua', datetime: '1988-05-01T01:30:00+08:00', numbers: [1, 2, 3] }),
          errors: [
            { type: 'bad' }, { type: 'calendar', date: '2026-02-30' },
            { type: 'calendar', date: '2100-12-31', time: '23:00' },
            { type: 'calendar', date: '1899-12-31' }, { time: '24:00' },
            { type: 'meihua', numbers: '1,,3' }, { type: 'meihua', numbers: '0,2,3' },
            { type: 'meihua', numbers: [1, 2, 1.5] },
            { type: 'liuren', longitude: 'east' }, { type: 'liuren', longitude: 181 },
            { type: 'liuren', monthGeneral: '甲' }, { type: 'liuren', nobleMode: 'bad' },
            { timezone: 'Not/A_Zone' }, { question: 'a'.repeat(2001) },
          ].map(params => calc({ timezone: 'UTC+08:00', ...params })),
        }
      })
      assert.deepEqual(checks.calendar.data.四柱.split(' '), expectedPillars)
      assert.equal(checks.liuren.ok, true)
      assert.equal(checks.liuren.data.贵人.模式, '夜贵')
      assert.equal(checks.liuren.data.三传.length, 3)
      assert(checks.liuren.data.真太阳时)
      assert.equal(checks.fixedNoon.input.time, '12:00:00')
      assert.equal(checks.historical.input.calculation.date + ' ' + checks.historical.input.calculation.time, '1988-05-01 01:30:00')
      for (const invalid of checks.errors) assert.equal(invalid.ok, false)
      await page.evaluate(() => PBlossomCompute.run({ type: 'meihua', numbers: '1,,3' }))
      assert.equal(await page.locator('html').getAttribute('data-state'), 'error')
      const zones = await page.evaluate(() => {
        const calc = params => PBlossomCompute.calculate({ type: 'calendar', ...params })
        return {
          now: calc({}),
          la: calc({ date: '2026-10-24', time: '23:30', timezone: 'America/Los_Angeles' }),
          sh: calc({ date: '2026-10-25', time: '14:30', timezone: 'Asia/Shanghai' }),
          iso: calc({ datetime: '2026-10-25T14:30:00+08:00' }),
          utc: calc({ datetime: '2026-10-25T06:30:00Z' }),
          gap: calc({ date: '2026-03-08', time: '02:30', timezone: 'America/Los_Angeles' }),
          fold: calc({ date: '2026-11-01', time: '01:30', timezone: 'America/Los_Angeles' }),
          fold1: calc({ datetime: '2026-11-01T01:30:00-07:00' }),
          fold2: calc({ datetime: '2026-11-01T01:30:00-08:00' }),
          noZone: calc({ datetime: '2026-10-25T14:30:00' }),
          conflict: calc({ datetime: '2026-10-25T06:30:00Z', date: '2026-10-25' }),
          missingHour: PBlossomCompute.calculate({ type: 'meihua', numbers: [1, 2, 3], date: '2026-10-25' }),
        }
      })
      for (const name of ['now', 'la', 'sh', 'iso', 'utc']) {
        assert.equal(zones[name].ok, true)
        assert.equal(zones[name].input.instant, '2026-10-25T06:30:00.000Z')
        assert.deepEqual(zones[name].data, zones.sh.data, '同一时刻在不同时区得到同一计算结果')
      }
      assert.equal(zones.now.input.timezone, timezoneId)
      assert.equal(zones.la.input.date, '2026-10-24')
      assert.equal(zones.la.input.calculation.date, '2026-10-25')
      assert.equal(zones.la.input.calculation.time, '14:30:00')
      for (const name of ['gap', 'fold', 'noZone', 'conflict', 'missingHour']) assert.equal(zones[name].ok, false)
      assert.equal(Date.parse(zones.fold2.input.instant) - Date.parse(zones.fold1.input.instant), 3600000)
      await page.evaluate(() => PBlossomCompute.run({ type: 'calendar', datetime: '2026-10-25T14:30:00+08:00' }))
      assert.deepEqual(JSON.parse(await page.locator('body').innerText()), await page.evaluate(() => pblossomResult))
      assert.equal(await page.locator('form, button, h1, summary').count(), 0, '只呈现 JSON')
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
      assert.deepEqual(errors, [])
      console.log(`${timezoneId}: 三类计算、跨时区、当前时刻、时区跨日、夏令时、纯 JSON 及无存储写入通过`)
      await context.close()
    }
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
