// 独立计算入口：仅加载核心模块，不启动主应用，不访问存储、历史或定位。
(function () {
  'use strict'
  const decoder = { base64ToArrayBuffer(value) {
    return Uint8Array.from(atob(value), char => char.charCodeAt(0)).buffer
  } }
  // 核心日历数据的唯一微信依赖；此页不加载 runtime.js。
  window.wx = decoder
  const calendar = window.__mp.require('utils/calendar.js')
  const meihua = window.__mp.require('utils/divination.js')
  const liuren = window.__mp.require('utils/liuren.js')
  const branches = '子丑寅卯辰巳午未申酉戌亥'
  const pad = value => String(value).padStart(2, '0')
  const invalid = message => { throw new Error(message) }

  const HOUR = 3600000
  function parseWall(date, time) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}(:\d{2})?$/.test(time)) invalid('日期须为 YYYY-MM-DD，时间须为 HH:mm 或 HH:mm:ss')
    const [y, m, d] = date.split('-').map(Number)
    const [h, mi, se = 0] = time.split(':').map(Number)
    const wall = Date.UTC(y, m - 1, d, h, mi, se)
    const dt = new Date(wall)
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d || h > 23 || mi > 59 || se > 59) invalid('日期或时间不存在')
    return wall
  }
  function wallText(wall) {
    const dt = new Date(wall)
    return { date: `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`, time: `${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}:${pad(dt.getUTCSeconds())}` }
  }
  function offsetMinutes(text) {
    if (text === 'Z' || text === 'UTC') return 0
    const match = /^(?:UTC)?([+-])(\d{2}):(\d{2})$/.exec(text)
    if (!match) return null
    const h = Number(match[2]), m = Number(match[3])
    if (h > 14 || m > 59 || (h === 14 && m !== 0)) invalid('时区偏移超出范围')
    return (match[1] === '+' ? 1 : -1) * (h * 60 + m)
  }
  function zoneClock(timezone) {
    const offset = offsetMinutes(timezone)
    if (offset !== null) return instant => instant + offset * 60000
    let format
    try {
      format = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, calendar: 'gregory', numberingSystem: 'latn', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
    } catch (e) { invalid('timezone 须为有效 IANA 时区，例如 America/Los_Angeles，或 UTC+08:00') }
    return instant => {
      const values = Object.fromEntries(format.formatToParts(instant).map(part => [part.type, part.value]))
      return Date.UTC(+values.year, +values.month - 1, +values.day, +values.hour, +values.minute, +values.second)
    }
  }
  function instantFromWall(wall, clock) {
    // 枚举这一天前后可能出现的 UTC 偏移，再反向核对；不猜测夏令时跳过/重复的钟面时间。
    const offsets = new Set()
    for (let h = -48; h <= 48; h += 6) {
      const sample = wall + h * HOUR
      offsets.add(clock(sample) - sample)
    }
    const candidates = [...offsets].map(offset => wall - offset).filter(instant => clock(instant) === wall)
    if (!candidates.length) invalid('该时区的这个时间不存在（可能处于夏令时跳时）；请传带偏移的 datetime')
    if (candidates.length > 1) invalid('该时区的这个时间重复出现（夏令时回拨）；请用带偏移的 datetime 明确是哪一次')
    return candidates[0]
  }
  function readTime(params) {
    let instant, timezone, clock, source
    if (params.datetime) {
      if (params.date || params.time) invalid('datetime 与 date/time 只能选一种方式')
      const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}(?::\d{2})?)(Z|[+-]\d{2}:\d{2})$/.exec(params.datetime)
      if (!match) invalid('datetime 须带时区，例如 2026-10-25T14:30:00+08:00；URL 中的 + 请编码为 %2B')
      instant = parseWall(match[1], match[2]) - offsetMinutes(match[3]) * 60000
      timezone = params.timezone || (match[3] === 'Z' ? 'UTC' : 'UTC' + match[3])
      clock = zoneClock(timezone)
      source = 'datetime'
    } else {
      timezone = params.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      clock = zoneClock(timezone)
      instant = Math.floor(Date.now() / 1000) * 1000
      source = 'current'
      if (params.date || params.time) {
        const now = wallText(clock(instant))
        if (params.type !== 'calendar' && params.type && params.date && !params.time) invalid('指定起卦日期时也须提供 time，或省略日期时间以使用当下时刻')
        const date = params.date || now.date
        const time = params.time || '12:00:00'
        instant = instantFromWall(parseWall(date, time), clock)
        source = 'local'
      }
    }
    // 原有历法与节气引擎以北京时间（固定 UTC+8）为基准，先将同一时刻归一化。
    const wall = instant + 8 * HOUR
    if (wall < Date.UTC(1900, 0, 1) || wall >= Date.UTC(2100, 11, 31, 23)) invalid('换算后的北京时间超出支持范围：1900-01-01 00:00:00 至 2100-12-31 22:59:59')
    const calculation = Object.assign(wallText(wall), { timezone: 'UTC+08:00' })
    return {
      wall, date: calculation.date, time: calculation.time,
      input: Object.assign(wallText(clock(instant)), { timezone, instant: new Date(instant).toISOString(), timeSource: source, calculation }),
    }
  }
  function calculate(params) {
    const type = params.type || 'calendar'
    const allowed = new Set(['type', 'date', 'time', 'datetime', 'timezone', 'numbers', 'question', 'longitude', 'monthGeneral', 'hourBranch', 'nobleMode'])
    try {
      for (const key of Object.keys(params)) if (!allowed.has(key)) invalid(`不支持的参数：${key}`)
      if (!['meihua', 'liuren', 'calendar'].includes(type)) invalid('type 须为 meihua、liuren 或 calendar')
      const { wall, date, time, input } = readTime(params)
      const question = params.question || ''
      if (typeof question !== 'string' || question.length > 2000) invalid('question 最多 2000 字符，仅作为备注，不自动解读文字')
      let data
      if (type === 'meihua') {
        const numbers = Array.isArray(params.numbers) ? params.numbers : String(params.numbers || '').split(',').map(value => /^\d+$/.test(value.trim()) ? Number(value) : NaN)
        if (numbers.length !== 3 || numbers.some(value => !Number.isSafeInteger(value) || value < 1)) invalid('numbers 须为三个正整数，例如 1,2,3')
        input.numbers = numbers
        input.question = question
        const result = meihua.performDivination(numbers, wall)
        result.note = question
        // 一次性结果不生成可保存的历史记录标识。
        delete result.id
        const ben = result.cards.find(card => card.key === 'ben')
        const hu = result.cards.find(card => card.key === 'hu')
        const bian = result.cards.find(card => card.key === 'bian')
        const tiUpper = ben.lines.some(line => line.roleLabel === '体' && line.sideName === ben.upperName)
        data = {
          四柱: result.ganzhiText, 本卦: ben.name, 互卦: hu.name, 变卦: bian.name,
          动爻: result.inputNums[2], 体卦: tiUpper ? ben.upperName : ben.lowerName,
          用卦: tiUpper ? ben.lowerName : ben.upperName,
        }
      } else if (type === 'liuren') {
        let longitude = null
        if (params.longitude != null && params.longitude !== '') {
          longitude = Number(params.longitude)
          if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) invalid('longitude 须在 -180 至 180 之间')
          // 真太阳时可能跨日，保守留出边界，防止读取不存在的历表。
          if (wall < Date.UTC(1900, 0, 2) || wall >= Date.UTC(2100, 11, 30)) invalid('使用经度校正时，日期须在 1900-01-02 至 2100-12-29 之间')
        }
        const overrides = {}
        for (const key of ['monthGeneral', 'hourBranch']) {
          if (params[key]) {
            if (typeof params[key] !== 'string' || params[key].length !== 1 || !branches.includes(params[key])) invalid(`${key} 须为一个地支`)
            overrides[key] = params[key]
          }
        }
        if (params.nobleMode) {
          if (!['day', 'night'].includes(params.nobleMode)) invalid('nobleMode 须为 day 或 night')
          overrides.nobleMode = params.nobleMode
        }
        Object.assign(input, { longitude, question, overrides })
        const result = liuren.performLiuren({ dateStr: date, timeStr: time, longitude, question, overrides })
        const lr = result.liuren
        data = {
          四柱: result.calendar.ganzhi.replace(/[年月日时]/g, ''), 农历: result.calendar.lunar,
          月将: lr.monthGeneral, 占时: lr.hourBranch,
          贵人: { 模式: lr.nobleMode, 地支: lr.nobleBranch, 落宫: lr.nobleEarth },
          旬: lr.xun, 空亡: lr.emptyBranches,
          天地盘: Object.fromEntries(lr.heavenEarthPlate.map(item => [item.earth, item.heaven])),
          天将: Object.fromEntries(lr.twelveGenerals.map(item => [item.earth, item.general])),
          四课: lr.fourLessons.map(item => ({ 干支: item.subject, 下: item.lower, 上: item.upper, 将: item.general })),
          三传: lr.threeTransmissions.map(item => ({ 干支: item.ganzhi, 六亲: item.sixRelative, 将: item.general, 空: item.isEmpty, 地盘: item.earth })),
          课体: lr.courseTypes,
        }
        if (result.calendar.trueSolarTime) data.真太阳时 = result.calendar.trueSolarTime
      } else {
        const info = calendar.getCalendarInfo(wall)
        const h = Number(time.slice(0, 2))
        const hour = calendar.getHourGanZhi(info.gzDay[0], h === 23 ? 0 : Math.floor((h + 1) / 2) % 12)
        data = { 农历: info.lunar, 四柱: `${info.gzYear} ${info.gzMonth} ${info.gzDay} ${hour}`, 节气: { 前: info.jieqiPrev, 后: info.jieqiNext } }
      }
      delete input.timeSource
      if (!input.question) delete input.question
      if (input.overrides && !Object.keys(input.overrides).length) delete input.overrides
      return { ok: true, type, input, data }
    } catch (error) {
      return { ok: false, type, error: { code: 'INVALID_INPUT', message: error.message } }
    }
  }
  const output = document.querySelector('#result')
  function run(params) {
    document.documentElement.dataset.state = 'computing'
    const result = calculate(params)
    window.pblossomResult = result
    output.textContent = JSON.stringify(result, null, 2)
    document.documentElement.dataset.state = result.ok ? 'ready' : 'error'
    document.dispatchEvent(new CustomEvent('pblossom:result', { detail: result }))
    return result
  }
  // Agent 可在浏览器中直接传参调用，返回普通对象；调用不改变网址或历史。
  window.PBlossomCompute = { calculate, run }
  const params = Object.fromEntries(new URLSearchParams(location.search))
  run(params)
})()
