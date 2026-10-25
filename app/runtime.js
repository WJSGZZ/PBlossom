// 网页版运行时：让小程序的页面逻辑（mp/bundle.js）原样跑在浏览器里。
// 这里实现小程序用到的那一部分 wx 接口和 Page()，界面用 Vue 渲染 mp/view.js 里由 WXML 转成的模板。
// 网页专有的部分（侧边栏、弹窗、图片预览）也在这里。
(function () {
  const { createApp, reactive, nextTick } = Vue
  const STORE_PREFIX = 'pblossom:'
  const root = () => document.getElementById('app')

  // ── 小弹层：提示、加载、对话框、操作菜单、图片预览 ─────────────────────────

  function layer(className, html) {
    const el = document.createElement('div')
    el.className = className
    // 弹出层挂在 body 下，拿不到页面上的主题色，这里抄一份
    const app = document.querySelector('.app')
    if (app) el.style.setProperty('--accent-rgb', getComputedStyle(app).getPropertyValue('--accent-rgb'))
    el.innerHTML = html
    document.body.appendChild(el)
    requestAnimationFrame(() => el.classList.add('on'))
    return el
  }
  function closeLayer(el) {
    if (!el || el._closing) return
    el._closing = true
    el.classList.remove('on')
    setTimeout(() => el.remove(), 260)
  }
  const escapeHtml = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

  let toastEl = null
  let toastTimer = null
  function toast(title, duration, loading) {
    clearTimeout(toastTimer)
    if (toastEl) toastEl.remove()
    toastEl = layer('web-toast', `<div class="web-toast-box lg">${loading ? '<span class="web-spinner"></span>' : ''}<span>${escapeHtml(title)}</span></div>`)
    if (!loading) {
      const el = toastEl
      toastTimer = setTimeout(() => closeLayer(el), duration || 1500)
    }
  }

  function modal(opts) {
    const showCancel = opts.showCancel !== false
    const el = layer('web-mask', `
      <div class="web-dialog lg" role="dialog" aria-modal="true">
        ${opts.title ? `<div class="web-dialog-title">${escapeHtml(opts.title)}</div>` : ''}
        ${opts.content ? `<div class="web-dialog-text">${escapeHtml(opts.content)}</div>` : ''}
        <div class="web-dialog-actions">
          ${showCancel ? `<button class="web-dialog-btn" data-r="cancel">${escapeHtml(opts.cancelText || '取消')}</button>` : ''}
          <button class="web-dialog-btn web-dialog-ok" data-r="confirm" style="${opts.confirmColor ? `color:${opts.confirmColor}` : ''}">${escapeHtml(opts.confirmText || '确定')}</button>
        </div>
      </div>`)
    const done = (confirm) => {
      closeLayer(el)
      const res = { confirm, cancel: !confirm }
      if (opts.success) opts.success(res)
      if (opts.complete) opts.complete(res)
    }
    el.addEventListener('click', (e) => {
      const r = e.target.closest('[data-r]')
      if (r) done(r.dataset.r === 'confirm')
      else if (e.target === el && showCancel) done(false)
    })
    const ok = el.querySelector('.web-dialog-ok')
    setTimeout(() => ok && ok.focus(), 50)
  }

  // 记下最近一次点击的按钮，操作菜单就贴着它弹出
  let lastTrigger = null
  let lastTriggerAt = 0
  document.addEventListener('click', (e) => {
    const el = e.target.closest && e.target.closest('.circle-btn, button, [role="button"], .row')
    if (el) { lastTrigger = el; lastTriggerAt = Date.now() }
  }, true)

  // 操作菜单（wx.showActionSheet）：不学手机从底部弹出，而是贴着点的按钮弹出一个小菜单，
  // 右边与按钮对齐，下方放不下就往上弹；点菜单外面或按 Esc 关闭。电脑和手机网页上一样
  function actionSheet(opts) {
    const anchor = lastTrigger && Date.now() - lastTriggerAt < 800 && document.contains(lastTrigger) ? lastTrigger : null
    const el = layer('web-popover-layer', `
      <div class="web-popover lg" role="menu">${opts.itemList.map((t, i) => `<button class="web-popover-item" role="menuitem" data-i="${i}">${escapeHtml(t)}</button>`).join('')}</div>`)
    const menu = el.querySelector('.web-popover')
    const gap = 8
    const vw = window.innerWidth
    const vh = window.innerHeight
    const mw = menu.offsetWidth
    const mh = menu.offsetHeight
    let left
    let top
    let origin
    if (anchor) {
      const r = anchor.getBoundingClientRect()
      left = Math.min(Math.max(12, r.right - mw), vw - mw - 12)
      const below = r.bottom + gap + mh <= vh - 12
      top = below ? r.bottom + gap : Math.max(12, r.top - gap - mh)
      origin = `${below ? 'top' : 'bottom'} right`
    } else {
      left = (vw - mw) / 2
      top = (vh - mh) / 2
      origin = 'center'
    }
    menu.style.left = `${left}px`
    menu.style.top = `${top}px`
    menu.style.transformOrigin = origin
    const close = (i) => {
      document.removeEventListener('keydown', onKey)
      closeLayer(el)
      if (i >= 0) { if (opts.success) opts.success({ tapIndex: i }) } else if (opts.fail) opts.fail({ errMsg: 'cancel' })
      if (opts.complete) opts.complete()
    }
    const onKey = (e) => { if (e.key === 'Escape') close(-1) }
    document.addEventListener('keydown', onKey)
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-i]')
      close(b ? Number(b.dataset.i) : -1)
    })
    setTimeout(() => { const first = menu.querySelector('button'); if (first) first.focus({ preventScroll: true }) }, 0)
  }

  // 小程序里这一步是微信自带的图片菜单（转发、保存）；网页上显示图片，可以下载或复制
  function imageViewer(url) {
    const el = layer('web-mask web-mask-image', `
      <div class="web-image">
        <img src="${url}" alt="分享图片">
        <div class="web-image-actions lg">
          <button class="web-image-btn" data-a="save">下载图片</button>
          ${navigator.clipboard && window.ClipboardItem ? '<button class="web-image-btn" data-a="copy">复制图片</button>' : ''}
        </div>
      </div>`)
    // 不设“关闭”按钮：点图片和按钮以外的任何地方、或按 Esc 就关掉
    const onKey = (e) => { if (e.key === 'Escape') { closeLayer(el); document.removeEventListener('keydown', onKey) } }
    document.addEventListener('keydown', onKey)
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-a]')
      if (!b) {
        if (!e.target.closest('img, .web-image-actions')) { closeLayer(el); document.removeEventListener('keydown', onKey) }
        return
      }
      if (b.dataset.a === 'save') {
        const a = document.createElement('a')
        a.href = url
        a.download = `PBlossom-${new Date().toISOString().slice(0, 10)}.png`
        a.click()
      }
      if (b.dataset.a === 'copy') {
        try {
          const blob = await (await fetch(url)).blob()
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          toast('已复制图片')
        } catch (err) { toast('复制失败') }
      }
    })
  }

  // ── 选择器查询：select(...).boundingClientRect() / scrollOffset() / node() / fields() ─────

  function selectorQuery() {
    const reqs = []
    const q = {
      in() { return q },
      select(sel) {
        const pick = (fn) => (cb) => { reqs.push({ sel, fn, cb }); return q }
        return {
          boundingClientRect: pick((el) => el.getBoundingClientRect()),
          scrollOffset: pick((el) => ({ scrollTop: el.scrollTop, scrollLeft: el.scrollLeft })),
          fields: (opts, cb) => pick((el) => {
            const r = el.getBoundingClientRect()
            return { node: nodeOf(el), width: r.width, height: r.height }
          })(cb),
          node: pick((el) => ({ node: nodeOf(el) })),
        }
      },
      exec(cb) {
        requestAnimationFrame(() => {
          const res = reqs.map(({ sel, fn, cb: one }) => {
            const el = root().querySelector(sel)
            const v = el ? fn(el) : null
            if (one) one(v)
            return v
          })
          if (cb) cb(res)
        })
      },
    }
    return q
  }
  // scroll-view 的节点有 scrollTo；画布节点就是 canvas 元素本身
  function nodeOf(el) {
    if (el.tagName === 'CANVAS') return el
    return {
      scrollTo({ top, animated }) { el.scrollTo({ top, behavior: animated ? 'smooth' : 'auto' }) },
    }
  }

  // ── 画布字体 ──
  // 导出图片的文字由小程序的 canvas-text.js 画：宋体字按预先导出的轮廓画，轮廓里没有的字和备注、问事
  // 用画布的 font 交给系统字体（serif / sans-serif）。网页有完整的宋体，把这两个系统字体名前面加上 PBlossomSerif
  const canvasFont = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'font')
  Object.defineProperty(CanvasRenderingContext2D.prototype, 'font', {
    configurable: true,
    get() { return canvasFont.get.call(this) },
    set(value) { canvasFont.set.call(this, String(value).replace(/(\dpx) (sans-serif|serif)$/, '$1 "PBlossomSerif", $2')) },
  })

  // ── wx ─────────────────────────────────────────────────────────────────────

  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const themeListeners = new Map()

  // ── 深色模式：跟随系统 / 浅色 / 深色（选项在小程序的“外观”里，选择与小程序存在同一个键下） ──
  // 系统的深浅色由浏览器的 prefers-color-scheme 告诉网页：macOS、iOS、安卓，以及 Windows 10/11
  // （设置 → 个性化 → 颜色 → 应用模式）上的 Chrome、Edge、Firefox 都支持，系统切换时网页跟着变。
  // 小程序的颜色由 .app.dark 切换；网页自己的样式（玻璃、弹层）写在“系统是深色”的媒体查询里，
  // 手动选浅色或深色时，把这些条件改成恒真或恒假；选回跟随系统就还原
  const APPEARANCE_KEY = STORE_PREFIX + 'pblossom_appearance'
  let appearance = 'system'
  try {
    // 旧网页版存在 pblossom:appearance（不是 JSON），搬到小程序的键下
    const old = localStorage.getItem(STORE_PREFIX + 'appearance')
    if (old) { localStorage.setItem(APPEARANCE_KEY, JSON.stringify(old)); localStorage.removeItem(STORE_PREFIX + 'appearance') }
    appearance = JSON.parse(localStorage.getItem(APPEARANCE_KEY) || '"system"')
  } catch (e) {}
  if (!['system', 'light', 'dark'].includes(appearance)) appearance = 'system'
  const effectiveDark = () => appearance === 'dark' || (appearance === 'system' && darkQuery.matches)
  const themeOf = () => (effectiveDark() ? 'dark' : 'light')
  const DARK_COND = /\(\s*prefers-color-scheme:\s*dark\s*\)/
  const darkRules = new WeakMap() // 规则 → 原来的条件
  function applyAppearance() {
    for (const sheet of document.styleSheets) {
      let rules
      try { rules = sheet.cssRules } catch (e) { continue }
      for (const rule of rules) {
        if (!(rule instanceof CSSMediaRule)) continue
        if (!darkRules.has(rule)) {
          if (!DARK_COND.test(rule.media.mediaText)) continue
          darkRules.set(rule, rule.media.mediaText)
        }
        const original = darkRules.get(rule)
        // (min-width: 0px) 恒真；(max-width: -1px) 不成立，整条条件为假
        rule.media.mediaText = appearance === 'system' ? original : original.replace(DARK_COND, effectiveDark() ? '(min-width: 0px)' : '(max-width: -1px)')
      }
    }
    // 浏览器自带的控件（日期选择、滚动条）也跟着深浅
    document.documentElement.style.colorScheme = appearance === 'system' ? 'light dark' : themeOf()
  }
  function setAppearance(mode) {
    appearance = mode
    applyAppearance()
    themeListeners.forEach((fn) => fn(true))
  }
  applyAppearance()
  const ok = (opts, res) => { if (opts && opts.success) opts.success(res); if (opts && opts.complete) opts.complete(res) }
  const fail = (opts, err) => { if (opts && opts.fail) opts.fail(err); if (opts && opts.complete) opts.complete(err) }

  window.wx = {
    getStorageSync(key) {
      try { const v = localStorage.getItem(STORE_PREFIX + key); return v == null ? '' : JSON.parse(v) } catch (e) { return '' }
    },
    setStorageSync(key, value) {
      try { localStorage.setItem(STORE_PREFIX + key, JSON.stringify(value)) } catch (e) {}
    },
    removeStorageSync(key) { try { localStorage.removeItem(STORE_PREFIX + key) } catch (e) {} },
    setClipboardData(opts) {
      const done = () => ok(opts, {})
      if (navigator.clipboard) navigator.clipboard.writeText(opts.data).then(done, () => fallbackCopy(opts.data) ? done() : fail(opts, {}))
      else if (fallbackCopy(opts.data)) done()
      else fail(opts, {})
    },
    getClipboardData(opts) {
      if (!navigator.clipboard || !navigator.clipboard.readText) { fail(opts, { errMsg: 'unsupported' }); return }
      navigator.clipboard.readText().then((data) => ok(opts, { data }), (err) => fail(opts, err))
    },
    showToast(opts) { toast(opts.title, opts.duration); ok(opts, {}) },
    showLoading(opts) { toast(opts.title || '加载中', 0, true) },
    hideLoading() { if (toastEl) closeLayer(toastEl) },
    showModal: modal,
    showActionSheet: actionSheet,
    showShareMenu() {},
    showShareImageMenu(opts) { imageViewer(opts.path); ok(opts, {}) },
    previewImage(opts) { imageViewer(opts.urls[0]); ok(opts, {}) },
    nextTick(cb) { nextTick(cb) },
    createSelectorQuery: selectorQuery,
    canvasToTempFilePath(opts) {
      opts.canvas.toBlob((blob) => blob ? ok(opts, { tempFilePath: URL.createObjectURL(blob) }) : fail(opts, {}), 'image/png')
    },
    getMenuButtonBoundingClientRect() { return WEB_CAPSULE },
    getAppBaseInfo() { return { theme: themeOf() } },
    onThemeChange(cb) {
      // 系统切换只在“跟随系统”时生效；手动切换（force）总是通知
      const fn = (force) => { if (force === true || appearance === 'system') cb({ theme: themeOf() }) }
      themeListeners.set(cb, fn)
      darkQuery.addEventListener('change', fn)
    },
    offThemeChange(cb) {
      const fn = themeListeners.get(cb)
      if (fn) darkQuery.removeEventListener('change', fn)
      themeListeners.delete(cb)
    },
    getLocation(opts) {
      if (!navigator.geolocation) { fail(opts, { errMsg: 'unsupported' }); return }
      navigator.geolocation.getCurrentPosition(
        (p) => ok(opts, { latitude: p.coords.latitude, longitude: p.coords.longitude }),
        (err) => fail(opts, { errMsg: err.message }),
        { timeout: 10000, maximumAge: 600000 })
    },
    base64ToArrayBuffer(b64) {
      const bin = atob(b64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      return bytes.buffer
    },
    loadFontFace(opts) { ok(opts, {}) },
    vibrateShort() {},
  }
  function fallbackCopy(text) {
    const t = document.createElement('textarea')
    t.value = text
    t.style.position = 'fixed'
    t.style.opacity = '0'
    document.body.appendChild(t)
    t.select()
    let done = false
    try { done = document.execCommand('copy') } catch (e) {}
    t.remove()
    return done
  }

  // 页面顶部留白按“胶囊按钮”的位置算；网页上没有胶囊，给一个与手机上相近的位置
  const WEB_CAPSULE = { top: 14, bottom: 40, left: 0, right: 0, width: 0, height: 26 }

  // ── Page() ─────────────────────────────────────────────────────────────────

  let pageDef = null
  window.Page = (def) => { pageDef = def }

  // setData 的路径写法：'a.b'、'a[0].b'
  function setPath(target, path, value) {
    const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.')
    let obj = target
    for (let i = 0; i < keys.length - 1; i++) {
      if (obj[keys[i]] == null) obj[keys[i]] = /^\d+$/.test(keys[i + 1]) ? [] : {}
      obj = obj[keys[i]]
    }
    obj[keys[keys.length - 1]] = value
  }

  function boot() {
    const mp = window.__mp
    mp.require('pages/index/index.js')
    const u = mp.require('pages/index/ui.wxs')
    const def = pageDef
    const raw = JSON.parse(JSON.stringify(def.data))
    const state = reactive(raw)

    const page = {}
    Object.keys(def).forEach((k) => { if (k !== 'data') page[k] = typeof def[k] === 'function' ? def[k].bind(page) : def[k] })
    page.data = raw
    page.setData = function (patch, cb) {
      Object.keys(patch || {}).forEach((k) => {
        if (/[.[]/.test(k)) setPath(state, k, patch[k])
        else state[k] = patch[k]
      })
      // 小程序的回调在新数据渲染完以后才执行；这里等 Vue 更新完 DOM，再强制浏览器把样式算一遍，
      // 否则“先关掉过渡瞬移、回调里再开过渡滑走”这类两步会被浏览器合成一次变化（节气条圆点会倒着滑）
      if (cb) nextTick(() => { void document.body.offsetWidth; cb() })
    }
    page.createSelectorQuery = selectorQuery
    // 页面方法里的 setData 都走 page.setData（onLoad 里会再包一层，见 page-factory.js）
    Object.keys(def).forEach((k) => { if (typeof def[k] === 'function') page[k] = def[k].bind(page) })

    const app = createApp({
      // 小程序里模板可以用页面初始数据里没写的字段，之后 setData 再补上；Vue 第一次在 setup 里找不到某个名字，
      // 就记成“不是页面数据”，以后补上了也不会更新。这里让模板认为页面数据里什么名字都有（还没值就是 undefined），
      // u、$mp 这些全局的名字除外
      setup() {
        return new Proxy(state, {
          getOwnPropertyDescriptor(target, key) {
            const own = Reflect.getOwnPropertyDescriptor(target, key)
            if (own || typeof key !== 'string' || key === 'u' || key[0] === '$' || key[0] === '_') return own
            return { value: undefined, writable: true, enumerable: false, configurable: true }
          },
        })
      },
      // 侧边栏放进 .app 里面，才能用到主题色等变量
      template: `<div class="mp-root">${window.__mpView.replace('长按一条记录可删除', '<span class="hint-touch">长按</span><span class="hint-mouse">右键点按</span>一条记录可删除').replace(/<\/div>$/, SIDEBAR + '</div>')}</div>`,
    })
    app.config.globalProperties.u = u
    app.config.globalProperties.$mp = {
      st(style) { return typeof style === 'string' ? style.replace(/(-?\d*\.?\d+)rpx/g, 'calc($1 * var(--rpx))') : style },
      ev(name, $event, dataset, id) {
        const fn = page[name]
        if (typeof fn !== 'function') { console.warn('missing handler', name); return }
        let value
        if ($event && typeof $event === 'object' && 'target' in $event && $event instanceof Event) {
          value = $event.target && 'value' in $event.target ? $event.target.value : undefined
        } else value = $event
        const target = { dataset, id }
        fn({ type: name, currentTarget: target, target, detail: { value } })
      },
    }
    app.directive('mp-focus', {
      mounted(el, b) { if (b.value) setTimeout(() => el.focus(), 0) },
      updated(el, b) { if (b.value && !b.oldValue) el.focus() },
    })
    app.component('mp-picker', PICKER)
    app.component('mp-switch', SWITCH)
    // 长按：按住 500 毫秒，或者在电脑上点右键
    app.directive('longpress', LONGPRESS)
    app.mount('#app')
    window.__page = page

    // 网页上没有微信的转发，结果页的“⋯”菜单多一项“复制链接”：链接带上与小程序转发相同的参数，打开就进入这一卦
    // 导出图片里的备注、问事：小程序只内嵌了界面用到的字，画布上这些用户自己写的字交给系统字体；
    // 网页有完整字体（见 web.css），画之前先把这些字要用的字体载好，画布里也写成宋体
    const exportResultImage = page.exportResultImage
    page.exportResultImage = async (...args) => {
      const model = typeof page._resultModel === 'function' ? page._resultModel() : null
      if (model && model.note && document.fonts) {
        try { await document.fonts.load('16px "PBlossomSerif"', model.note) } catch (e) {}
      }
      return exportResultImage.apply(page, args)
    }
    // 网页上还能把这一卦存成 .txt（内容与“复制文字”相同，可以再从文件导入）
    page.openResultMenu = () => actionSheet({
      itemList: ['复制文字', '下载文字', '导出图片', '复制链接'],
      success: ({ tapIndex }) => {
        if (tapIndex === 0) page.copyResult()
        if (tapIndex === 1) downloadCurrentResult()
        if (tapIndex === 2) page.exportResultImage()
        if (tapIndex === 3) {
          const url = `${location.origin}${location.pathname}?${new URLSearchParams(page.getShareParams())}`
          wx.setClipboardData({ data: url, success: () => toast('链接已复制') })
        }
      },
    })

    // 小程序打不开外部网页，只能复制链接；网页版点“关于”卡片直接在新标签页打开 GitHub 仓库
    page.openGithubRepo = () => window.open('https://github.com/WJSGZZ/PBlossom', '_blank', 'noopener')
    // 小程序复制微信号时由微信自己弹“内容已复制”；网页没有这个系统提示，自己弹一个
    page.copyContact = (e) => {
      const value = e.currentTarget.dataset.value
      if (value) wx.setClipboardData({ data: value, success: () => toast('微信号已复制') })
    }

    // 外观里的“深色模式”：网页先把自己样式里的深色条件改好（小程序判断深浅时要问它），
    // 小程序再存好选择、换上 .app.dark
    const selectAppearance = page.selectAppearance
    page.selectAppearance = (e) => {
      setAppearance(e.currentTarget.dataset.id)
      selectAppearance.call(page, e)
    }

    // ── 从文件导入卦例（网页专有）：文件内容与“复制文字”导出的文本相同（旧网页版导出的 .txt 也是这种格式），
    //    解析直接复用小程序的“从剪贴板导入”。可以在往昔的“⋯”菜单里选文件，也可以把文件拖进网页 ──
    async function importFiles(files) {
      const list = [...files].filter((f) => /\.(txt|text|md)$/i.test(f.name) || f.type.startsWith('text/'))
      if (!list.length) { toast('请选择 .txt 文本文件'); return }
      const before = page.data.historyItems.length
      let failed = 0
      const realToast = page.showCustomToast
      const realClip = wx.getClipboardData
      page.showCustomToast = (text) => { if (text !== '导入成功') failed++ }
      try {
        for (const f of list) {
          const text = await f.text()
          wx.getClipboardData = (o) => o.success({ data: text })
          page.importFromClipboard()
        }
      } finally {
        wx.getClipboardData = realClip
        page.showCustomToast = realToast
      }
      const added = page.data.historyItems.length - before
      if (added > 0) page.switchTab({ currentTarget: { dataset: { tab: 'history' } } })
      toast(added ? `已导入 ${added} 条${failed ? `，${failed} 个无法识别` : ''}` : '格式无法识别')
    }
    function pickFiles() {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.txt,.text,.md,text/plain'
      input.multiple = true
      input.onchange = () => importFiles(input.files)
      input.click()
    }
    page.openHistoryMenu = () => actionSheet({
      itemList: ['从文件导入', '从剪贴板导入', '导出全部记录'],
      success: ({ tapIndex }) => {
        if (tapIndex === 0) pickFiles()
        if (tapIndex === 1) page.importFromClipboard()
        if (tapIndex === 2) exportAllRecords()
      },
    })

    // ── 导出（网页专有）：每条记录一个 .txt，内容与“复制文字”相同，下载后还能从文件导入；
    //    导出全部记录时打成一个 zip ──
    function recordFileName(r) {
      const liuren = r.type === 'liuren'
      const input = r.liurenInput || {}
      const when = liuren ? `${input.dateStr || ''} ${input.timeStr || ''}` : String(r.timestamp || '')
      const name = liuren ? r.title : (r.cards && r.cards[0] && r.cards[0].name) || ''
      const base = `${liuren ? '六壬' : '梅花'} ${name} ${when}`.replace(/:/g, '.').replace(/[\\/*?"<>|]/g, '-').replace(/\s+/g, ' ').trim()
      return `${base}.txt`
    }
    function saveFile(blob, name) {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = name
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    }
    const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
    function downloadCurrentResult() {
      // 文字取“复制文字”那一份：借用一下剪贴板接口把它接住
      let text = ''
      const realCopy = wx.setClipboardData
      wx.setClipboardData = (o) => { text = o.data }
      try { page.copyResult() } finally { wx.setClipboardData = realCopy }
      if (!text) return
      const d = page.data
      const id = d.liurenMode ? d.liurenResult && d.liurenResult._historyId : d.currentResult && d.currentResult.id
      const record = d.historyItems.find((r) => r.id === id)
      saveFile(new Blob([text], { type: 'text/plain;charset=utf-8' }), record ? recordFileName(record) : `PBlossom ${today()}.txt`)
    }
    function exportAllRecords() {
      const records = page.data.historyItems || []
      if (!records.length) { toast('暂无'); return }
      const enc = new TextEncoder()
      const used = new Map()
      const files = []
      for (const r of records) {
        const text = page.historyRecordText(r)
        if (!text) continue
        // 同名的记录（同一时刻的同一卦）加上序号
        let name = recordFileName(r)
        const n = (used.get(name) || 0) + 1
        used.set(name, n)
        if (n > 1) name = name.replace(/\.txt$/, ` (${n}).txt`)
        files.push({ name, data: enc.encode(text) })
      }
      if (!files.length) { toast('暂无'); return }
      saveFile(makeZip(files), `PBlossom 往昔 ${today()}.zip`)
      toast(`已导出 ${files.length} 条`)
    }
    // 最简单的 zip：不压缩（存储），文件名用 UTF-8（第 11 位标记），解压软件都认得中文名
    const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
      return c >>> 0
    })
    function crc32(bytes) {
      let c = 0xFFFFFFFF
      for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8)
      return (c ^ 0xFFFFFFFF) >>> 0
    }
    function makeZip(files) {
      const enc = new TextEncoder()
      const now = new Date()
      const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)
      const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()
      const parts = []
      const central = []
      let offset = 0
      for (const f of files) {
        const name = enc.encode(f.name)
        const crc = crc32(f.data)
        const local = new DataView(new ArrayBuffer(30))
        local.setUint32(0, 0x04034b50, true)
        local.setUint16(4, 20, true)
        local.setUint16(6, 0x0800, true)
        local.setUint16(8, 0, true)
        local.setUint16(10, time, true)
        local.setUint16(12, date, true)
        local.setUint32(14, crc, true)
        local.setUint32(18, f.data.length, true)
        local.setUint32(22, f.data.length, true)
        local.setUint16(26, name.length, true)
        parts.push(local, name, f.data)
        const cd = new DataView(new ArrayBuffer(46))
        cd.setUint32(0, 0x02014b50, true)
        cd.setUint16(4, 20, true)
        cd.setUint16(6, 20, true)
        cd.setUint16(8, 0x0800, true)
        cd.setUint16(10, 0, true)
        cd.setUint16(12, time, true)
        cd.setUint16(14, date, true)
        cd.setUint32(16, crc, true)
        cd.setUint32(20, f.data.length, true)
        cd.setUint32(24, f.data.length, true)
        cd.setUint16(28, name.length, true)
        cd.setUint32(42, offset, true)
        central.push(cd, name)
        offset += 30 + name.length + f.data.length
      }
      const size = central.reduce((n, p) => n + p.byteLength, 0)
      const end = new DataView(new ArrayBuffer(22))
      end.setUint32(0, 0x06054b50, true)
      end.setUint16(8, files.length, true)
      end.setUint16(10, files.length, true)
      end.setUint32(12, size, true)
      end.setUint32(16, offset, true)
      return new Blob([...parts, ...central, end], { type: 'application/zip' })
    }
    // 拖文件进网页
    let dragDepth = 0
    let dropHint = null
    const hasFiles = (e) => e.dataTransfer && [...e.dataTransfer.types].includes('Files')
    window.addEventListener('dragenter', (e) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      if (dragDepth++ === 0) dropHint = layer('web-drop', '<div class="web-drop-box lg">松开即可导入卦例<small>支持复制文字导出的 .txt 文件</small></div>')
    })
    window.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault() })
    window.addEventListener('dragleave', (e) => { if (hasFiles(e) && --dragDepth <= 0) { dragDepth = 0; closeLayer(dropHint) } })
    window.addEventListener('drop', (e) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      dragDepth = 0
      closeLayer(dropHint)
      importFiles(e.dataTransfer.files)
    })

    const query = Object.fromEntries(new URLSearchParams(location.search))
    // 分享链接只用一次：进入后把地址栏的参数去掉，刷新时不会再导入一次
    if (query.s) history.replaceState(null, '', location.pathname)
    page.onLoad(query)
    if (page.onShow) page.onShow()
    if (page.onReady) page.onReady()
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && page.onShow) page.onShow()
      if (document.visibilityState === 'hidden' && page.onHide) page.onHide()
    })
  }

  // 电脑上的侧边栏：只有 logo 和图标，帮助放在最下面；手机上用小程序那条底部页签栏
  const SIDEBAR = `
    <nav class="web-sidebar" aria-label="页面">
      <img class="web-sidebar-logo" src="assets/logo.svg" alt="PBlossom">
      <button v-for="(tab, i) in navTabs.slice(0, 3)" :key="tab.key" :class="['web-side-btn', u.tabIndex(activeTab) === i ? 'on' : '']"
        :aria-label="tab.label" :title="tab.label" @click="$mp.ev('switchTab', null, { tab: tab.key }, '')">
        <span :class="'icon web-side-icon icon-tab-' + tab.key"></span>
      </button>
      <button :class="['web-side-btn web-side-bottom', activeTab === 'help' ? 'on' : '']" aria-label="常见问题" title="常见问题"
        @click="$mp.ev('switchTab', null, { tab: 'help' }, '')">
        <span class="icon web-side-icon icon-tab-help"></span>
        <span v-if="showFaqDot" class="web-side-badge"></span>
      </button>
    </nav>`

  // <picker>：把透明的原生控件盖在内容上，点内容就弹出系统的日期、时间或列表选择
  const PICKER = {
    props: ['mode', 'range', 'value', 'start', 'end', 'fields'],
    emits: ['change'],
    computed: {
      kind() { return this.mode === 'date' ? (this.fields === 'month' ? 'month' : 'date') : this.mode === 'time' ? 'time' : 'selector' },
    },
    methods: {
      open(e) {
        const input = this.$refs.input
        if (input && input.showPicker) { try { input.showPicker(); e.preventDefault() } catch (err) {} }
      },
      change(e) {
        const v = e.target.value
        if (!v) return
        this.$emit('change', this.kind === 'selector' ? Number(v) : v)
      },
    },
    template: `
      <div class="mp-picker" @click="kind !== 'selector' && open($event)">
        <slot></slot>
        <select v-if="kind === 'selector'" class="mp-picker-native" :value="value" @change="change">
          <option v-for="(t, i) in range" :key="i" :value="i">{{ t }}</option>
        </select>
        <input v-else ref="input" class="mp-picker-native" :type="kind" :value="value" :min="start" :max="end" @change="change" tabindex="-1">
      </div>`,
  }

  // <switch>：与系统开关一样的外观，颜色取主题色
  const SWITCH = {
    props: ['checked', 'color'],
    emits: ['change'],
    data() { return { on: !!this.checked } },
    watch: { checked(v) { this.on = !!v } },
    methods: { toggle() { this.on = !this.on; this.$emit('change', this.on) } },
    template: `<button type="button" role="switch" :aria-checked="on" :class="['mp-switch', on ? 'on' : '']" :style="on && color ? { background: color } : null" @click="toggle"><span class="mp-switch-knob"></span></button>`,
  }

  const LONGPRESS = {
    mounted(el, b) {
      let timer = null
      let fired = false
      // 鼠标用右键（contextmenu），手指和触控笔才按住计时
      const start = (e) => {
        fired = false
        if (e.pointerType === 'mouse') return
        timer = setTimeout(() => { fired = true; el.dispatchEvent(new CustomEvent('longpress')) }, 500)
      }
      const cancel = () => clearTimeout(timer)
      el.addEventListener('pointerdown', start)
      el.addEventListener('pointerup', cancel)
      el.addEventListener('pointerleave', cancel)
      el.addEventListener('pointercancel', cancel)
      el.addEventListener('contextmenu', (e) => { e.preventDefault(); cancel(); if (!fired) el.dispatchEvent(new CustomEvent('longpress')) })
      // 长按触发后，松手时的那次点按不再打开记录
      el.addEventListener('click', (e) => { if (fired) { e.stopImmediatePropagation(); e.preventDefault(); fired = false } }, true)
    },
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot)
  else boot()
})()
