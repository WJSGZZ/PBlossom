// 液态玻璃的折射：仿 iOS 26 的 .glassEffect(.regular)，做法参考 liqui.design。
// 按每块玻璃的尺寸和圆角生成一张位移图：中间不动，边缘一圈（bezel）像凸透镜一样把背后的画面往里折，
// 折射强度随玻璃大小变化；折完再把明暗往中间压一点（frost），像磨砂玻璃。
// 背后先轻轻模糊，再折射：backdrop-filter: blur() saturate() url(#滤镜)。
// 只有 Chromium 内核支持 backdrop-filter: url()，其他浏览器保留 web.css 里的普通模糊玻璃。
(function () {
  if (!/Chrome\//.test(navigator.userAgent) || !CSS.supports('backdrop-filter', 'url(#x)')) return
  if (window.matchMedia('(prefers-reduced-transparency: reduce)').matches) return

  // 哪些元素做折射，以及边缘宽度（bezel）；折射强度按短边算：refract = 短边 × k，最多 max
  const TARGETS = [
    ['.web-sidebar', { bezel: 28, k: 0.9, max: 110 }],
    ['.tabbar', { bezel: 24, k: 0.9, max: 90 }],
    ['.circle-btn', { bezel: 14, k: 0.9, max: 40 }],
    ['.segmented', { bezel: 18, k: 1.2, max: 60 }],
    ['.card, .panel, .reveal-block', { bezel: 28, k: 0.6, max: 120 }],
    ['.tile', { bezel: 24, k: 0.6, max: 100 }],
    // 浮层（弹出菜单、对话框、提示、看图的按钮、拖入提示）压在内容上，背后多模糊一些
    ['.web-popover, .web-dialog, .web-drop-box', { bezel: 20, k: 0.5, max: 70, blur: 14 }],
    ['.web-toast-box, .web-image-btn', { bezel: 14, k: 0.8, max: 40, blur: 14 }],
  ]
  // 磨砂：输出的明暗压到 [lo, hi] 之间（0～1 原样输出是 0 和 1）
  const FROST = [0.05, 0.99]

  const NS = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  svg.setAttribute('aria-hidden', 'true')
  svg.style.position = 'absolute'
  document.body.appendChild(svg)
  const maps = new Map() // 同样尺寸的元素共用一个滤镜
  let uid = 0

  // 圆角矩形的有向距离（内部为负）
  function sdf(x, y, w, h, r) {
    const qx = Math.abs(x - w / 2) - (w / 2 - r)
    const qy = Math.abs(y - h / 2) - (h / 2 - r)
    return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r
  }

  function displacementMap(w, h, r, bezel) {
    const s = 0.5 // 半分辨率生成，滤镜里再拉伸
    const cw = Math.max(2, Math.round(w * s))
    const ch = Math.max(2, Math.round(h * s))
    const c = document.createElement('canvas')
    c.width = cw
    c.height = ch
    const ctx = c.getContext('2d')
    const img = ctx.createImageData(cw, ch)
    const d = img.data
    for (let j = 0; j < ch; j++) {
      for (let i = 0; i < cw; i++) {
        const x = (i + 0.5) / s
        const y = (j + 0.5) / s
        const dist = -sdf(x, y, w, h, r)
        let dx = 0
        let dy = 0
        if (dist > 0 && dist < bezel) {
          const e = 0.75
          const gx = sdf(x + e, y, w, h, r) - sdf(x - e, y, w, h, r)
          const gy = sdf(x, y + e, w, h, r) - sdf(x, y - e, w, h, r)
          const gl = Math.hypot(gx, gy) || 1
          // 凸面玻璃的边缘：越靠边越斜，折得越多
          const mag = Math.pow(1 - dist / bezel, 2.2)
          dx = (gx / gl) * mag
          dy = (gy / gl) * mag
        }
        const k = (j * cw + i) * 4
        d[k] = 128 + dx * 127
        d[k + 1] = 128 + dy * 127
        d[k + 2] = 128
        d[k + 3] = 255
      }
    }
    ctx.putImageData(img, 0, 0)
    return c.toDataURL()
  }

  function filterFor(w, h, r, bezel, refract) {
    const key = [w, h, Math.round(r), bezel, refract].join('x')
    if (maps.has(key)) return maps.get(key)
    const id = 'lg' + (++uid)
    const f = document.createElementNS(NS, 'filter')
    f.id = id
    f.setAttribute('x', '0')
    f.setAttribute('y', '0')
    f.setAttribute('width', w)
    f.setAttribute('height', h)
    f.setAttribute('filterUnits', 'userSpaceOnUse')
    f.setAttribute('color-interpolation-filters', 'sRGB')
    f.innerHTML = `
      <feImage href="${displacementMap(w, h, r, bezel)}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="m"/>
      <feDisplacementMap in="SourceGraphic" in2="m" scale="${-refract}" xChannelSelector="R" yChannelSelector="G"/>
      <feComponentTransfer>
        <feFuncR type="linear" slope="${FROST[1] - FROST[0]}" intercept="${FROST[0]}"/>
        <feFuncG type="linear" slope="${FROST[1] - FROST[0]}" intercept="${FROST[0]}"/>
        <feFuncB type="linear" slope="${FROST[1] - FROST[0]}" intercept="${FROST[0]}"/>
      </feComponentTransfer>`
    svg.appendChild(f)
    maps.set(key, id)
    return id
  }

  function apply(el, opts) {
    const w = Math.round(el.offsetWidth)
    const h = Math.round(el.offsetHeight)
    if (!w || !h) return
    const key = `${w}x${h}`
    if (el.dataset.lg === key) return
    el.dataset.lg = key
    const r = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, w / 2, h / 2)
    const bezel = Math.min(opts.bezel, w / 2, h / 2)
    const refract = Math.round(Math.min(opts.max, Math.min(w, h) * opts.k))
    const id = filterFor(w, h, r, bezel, refract)
    el.style.backdropFilter = el.style.webkitBackdropFilter = `blur(${opts.blur || 6}px) saturate(140%) url(#${id})`
  }

  const watched = new WeakSet()
  const ro = new ResizeObserver((entries) => entries.forEach((e) => { e.target.dataset.lg = ''; scanOne(e.target) }))
  function scanOne(el) {
    for (const [sel, opts] of TARGETS) if (el.matches(sel)) { apply(el, opts); return }
  }
  function scan() {
    for (const [sel, opts] of TARGETS) {
      document.querySelectorAll(sel).forEach((el) => {
        if (!watched.has(el)) { watched.add(el); ro.observe(el) }
        apply(el, opts)
      })
    }
  }
  let pending = false
  const mo = new MutationObserver(() => {
    if (pending) return
    pending = true
    requestAnimationFrame(() => { pending = false; scan() })
  })
  mo.observe(document.getElementById('app'), { childList: true, subtree: true })
  // 弹出菜单挂在 body 下，不在 #app 里
  mo.observe(document.body, { childList: true })
  scan()
})()
