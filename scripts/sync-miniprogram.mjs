// 把小程序（../miniprogram）同步成网页版用的文件，生成到 mp/：
//   mp/bundle.js  小程序的页面逻辑、计算和数据（CommonJS 模块原样打包，浏览器里用一个小 require 加载）
//   mp/view.js    index.wxml 转成的 Vue 模板
//   mp/mp.css     index.wxss 转成的 CSS（rpx 换成 var(--rpx) 的倍数）
//   assets/fonts/PBlossomSerif.woff  页面字体
// 小程序是整个项目的最新版本，网页版的界面和逻辑都以它为准；改了小程序后重新运行：
//   node scripts/sync-miniprogram.mjs [小程序目录，默认 ../miniprogram]

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MP = path.resolve(process.argv[2] || path.join(WEB, '..', 'miniprogram'))
const OUT = path.join(WEB, 'mp')
fs.mkdirSync(OUT, { recursive: true })
fs.mkdirSync(path.join(WEB, 'assets', 'fonts'), { recursive: true })

// ── JS：从入口出发收集 require 到的模块 ──────────────────────────────────────

const ENTRIES = ['pages/index/index.js', 'pages/index/ui.wxs']
const modules = new Map()
function collect(rel) {
  if (modules.has(rel)) return
  // 统一成 LF 换行（个别小程序文件是 CRLF）
  const src = fs.readFileSync(path.join(MP, rel), 'utf8').replace(/\r\n/g, '\n')
  modules.set(rel, src)
  for (const m of src.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)) collect(resolve(rel, m[1]))
}
function resolve(from, spec) {
  let p = path.posix.normalize(path.posix.join(path.posix.dirname(from), spec))
  if (!/\.(js|wxs)$/.test(p)) p += '.js'
  return p
}
ENTRIES.forEach(collect)

let bundle = `// 由 scripts/sync-miniprogram.mjs 从小程序生成，不要手改\n(function () {\nconst defs = {}\n`
for (const [rel, src] of modules) {
  bundle += `defs[${JSON.stringify(rel)}] = function (module, exports, require) {\n${src}\n}\n`
}
bundle += `const cache = {}
function dirname(p) { return p.slice(0, p.lastIndexOf('/') + 1) }
function norm(p) { const out = []; p.split('/').forEach((s) => { if (s === '..') out.pop(); else if (s && s !== '.') out.push(s) }); return out.join('/') }
function load(id) {
  if (cache[id]) return cache[id].exports
  if (!defs[id]) throw new Error('module not found: ' + id)
  const module = { exports: {} }
  cache[id] = module
  defs[id](module, module.exports, (spec) => { let p = norm(dirname(id) + spec); if (!/\\.(js|wxs)$/.test(p)) p += '.js'; return load(p) })
  return module.exports
}
window.__mp = { require: load }
})()
`
fs.writeFileSync(path.join(OUT, 'bundle.js'), bundle)

// ── 字体 ─────────────────────────────────────────────────────────────────────

const fontJs = fs.readFileSync(path.join(MP, 'assets/fonts/PBlossomSerif.js'), 'utf8')
const fontB64 = fontJs.match(/'([A-Za-z0-9+/=]+)'/)[1]
fs.writeFileSync(path.join(WEB, 'assets/fonts/PBlossomSerif.woff'), Buffer.from(fontB64, 'base64'))
fs.copyFileSync(path.join(MP, 'logo.svg'), path.join(WEB, 'assets/logo.svg'))

// ── WXSS → CSS ──────────────────────────────────────────────────────────────

let css = fs.readFileSync(path.join(MP, 'pages/index/index.wxss'), 'utf8')
css = css.replace(/(-?\d*\.?\d+)rpx/g, (_, n) => `calc(${n} * var(--rpx))`)
css = css.replace(/^page\s*\{/m, '.mp-root {')
fs.writeFileSync(path.join(OUT, 'mp.css'), `/* 由 scripts/sync-miniprogram.mjs 从小程序 index.wxss 生成，不要手改；网页专用的样式写在 app/web.css */\n${css}`)

// ── WXML → Vue 模板 ─────────────────────────────────────────────────────────

const wxml = fs.readFileSync(path.join(MP, 'pages/index/index.wxml'), 'utf8')

// 极简的 XML 解析：标签、属性、文字、注释
function parse(src) {
  const root = { tag: '#root', attrs: {}, children: [] }
  const stack = [root]
  let i = 0
  while (i < src.length) {
    if (src.startsWith('<!--', i)) { i = src.indexOf('-->', i) + 3; continue }
    if (src[i] === '<') {
      if (src[i + 1] === '/') {
        const end = src.indexOf('>', i)
        const name = src.slice(i + 2, end).trim()
        // image、input 按无内容的标签处理，写成 <image></image> 时忽略结束标签
        if (name === 'image' || name === 'input') { i = end + 1; continue }
        const top = stack.pop()
        if (top.tag !== name) throw new Error(`mismatched </${name}> (open <${top.tag}>)`)
        i = end + 1
        continue
      }
      // 读到标签结束：属性值里可能有 >，按引号跳过
      let j = i + 1
      let quote = null
      while (j < src.length) {
        const c = src[j]
        if (quote) { if (c === quote) quote = null } else if (c === '"' || c === "'") quote = c
        else if (c === '>') break
        j++
      }
      let body = src.slice(i + 1, j)
      const selfClose = body.endsWith('/')
      if (selfClose) body = body.slice(0, -1)
      const name = body.match(/^[\w-]+/)[0]
      const attrs = {}
      for (const m of body.slice(name.length).matchAll(/([\w:.-]+)(?:\s*=\s*("([^"]*)"|'([^']*)'))?/g)) {
        attrs[m[1]] = m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : true
      }
      const node = { tag: name, attrs, children: [] }
      stack[stack.length - 1].children.push(node)
      if (!selfClose && name !== 'wxs' && name !== 'input' && name !== 'image') stack.push(node)
      if (name === 'wxs' && !selfClose) { i = src.indexOf('</wxs>', j) + 6; continue }
      i = j + 1
      continue
    }
    const next = src.indexOf('<', i)
    const text = src.slice(i, next < 0 ? src.length : next)
    if (text.trim()) stack[stack.length - 1].children.push({ text })
    i = next < 0 ? src.length : next
  }
  return root
}

const ast = parse(wxml)
const templates = {}
ast.children = ast.children.filter((n) => {
  if (n.tag === 'template' && n.attrs.name) { templates[n.attrs.name] = n; return false }
  return n.tag !== 'wxs'
})

const TAGS = { view: 'div', text: 'span', image: 'img', block: 'template', 'scroll-view': 'div', canvas: 'canvas', input: 'input', picker: 'mp-picker', switch: 'mp-switch' }
const EVENTS = { bindtap: 'click', bindlongpress: 'longpress', bindinput: 'input', bindchange: 'change', bindconfirm: 'keydown.enter', bindfocus: 'focus', bindblur: 'blur' }
const DROP = new Set(['hover-class', 'scroll-y', 'enhanced', 'bounces', 'show-scrollbar', 'always-embed', 'cursor-color', 'mode', 'wx:key', 'wx:for-item', 'wx:for-index', 'confirm-type'])
const KEEP_ON_PICKER = new Set(['mode', 'range', 'value', 'start', 'end', 'fields'])

const onlyExpr = (v) => { const m = typeof v === 'string' && v.match(/^\{\{([\s\S]*)\}\}$/); return m && !m[1].includes('}}') ? m[1].trim() : null }
const hasExpr = (v) => typeof v === 'string' && v.includes('{{')
function toTemplateLiteral(v) {
  return '`' + v.split(/(\{\{[\s\S]*?\}\})/).map((part) => {
    const m = part.match(/^\{\{([\s\S]*)\}\}$/)
    return m ? '${' + m[1].trim() + '}' : part.replace(/`/g, '\\`')
  }).join('') + '`'
}
const quote = (v) => `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
const valueExpr = (v) => (v === true ? 'true' : onlyExpr(v) || (hasExpr(v) ? toTemplateLiteral(v) : quote(v)))
const esc = (s) => s.replace(/"/g, '&quot;')
const camel = (s) => s.replace(/-(\w)/g, (_, c) => c.toUpperCase())

function render(node, scope) {
  if (node.text !== undefined) return node.text
  const a = node.attrs
  if (node.tag === 'template' && a.is) {
    // <template is="x" data="{{a: 1, b: c}}"/> → 就地展开，用 v-for 的解构把数据变成模板内的变量
    const tpl = templates[a.is]
    const data = onlyExpr(a.data) || ''
    const keys = [...data.matchAll(/(?:^|,)\s*(\w+)\s*:/g)].map((m) => m[1])
    const inner = tpl.children.map((c) => render(c, scope)).join('')
    return `<template v-for="({ ${keys.join(', ')} }) in [{ ${data} }]">${inner}</template>`
  }
  const tag = TAGS[node.tag] || node.tag
  const out = []
  // 小程序的 <text> 会保留文字里的换行，网页的 span 不会；标上 data-t，web.css 给它 white-space: pre-line
  if (node.tag === 'text') out.push('data-t')
  let loop = ''
  if (a['wx:for']) {
    const item = a['wx:for-item'] || 'item'
    const index = a['wx:for-index'] || 'index'
    const list = onlyExpr(a['wx:for'])
    loop = `(${item}, ${index}) in ${list}`
    const key = a['wx:key']
    const keyExpr = !key ? index : key === '*this' ? item : `${item}.${key}`
    out.push(`v-for="${esc(loop)}"`, `:key="${esc(keyExpr)}"`)
  }
  let cond = ''
  if (a['wx:if']) cond = `v-if="${esc(onlyExpr(a['wx:if']))}"`
  else if (a['wx:elif']) cond = `v-else-if="${esc(onlyExpr(a['wx:elif']))}"`
  else if ('wx:else' in a) cond = 'v-else'

  // data-* 收集成 dataset，事件处理时传给页面方法
  const dataset = Object.keys(a).filter((k) => k.startsWith('data-')).map((k) => `${camel(k.slice(5))}: ${valueExpr(a[k])}`)
  const ds = `{ ${dataset.join(', ')} }`
  const idExpr = a.id ? valueExpr(a.id) : "''"

  for (const [k, v] of Object.entries(a)) {
    if (k.startsWith('wx:') || k.startsWith('data-')) continue
    if (DROP.has(k) && !(tag === 'mp-picker' && KEEP_ON_PICKER.has(k))) continue
    if (EVENTS[k]) {
      if (k === 'bindlongpress') out.push('v-longpress')
      out.push(`@${EVENTS[k]}="${esc(`$mp.ev('${v}', $event, ${ds}, ${idExpr})`)}"`)
      continue
    }
    if (k === 'focus') { out.push(`v-mp-focus="${esc(valueExpr(v))}"`); continue }
    if (k === 'aria-role') { out.push(`role="${v}"`); continue }
    if (k === 'maxlength') { out.push(`maxlength="${v}"`); continue }
    if (k === 'type' && v === 'number') { out.push('type="text"', 'inputmode="numeric"', 'pattern="[0-9]*"'); continue }
    if (k === 'src' && typeof v === 'string' && v.startsWith('/')) { out.push(`src="assets${v}"`); continue }
    // 页面逻辑拼出来的内联样式里也有 rpx，渲染时换算
    if (k === 'style' && hasExpr(v)) out.push(`:style="${esc(`$mp.st(${valueExpr(v)})`)}"`)
    else if (hasExpr(v)) out.push(`:${k}="${esc(valueExpr(v))}"`)
    else if (v === true) out.push(k)
    else out.push(`${k}="${esc(v)}"`)
  }
  if (node.tag === 'scroll-view') out.push('data-scroll-view')

  const children = node.children.map((c) => render(c, scope)).join('')
  const open = (attrs) => `<${tag}${attrs.length ? ' ' + attrs.join(' ') : ''}>`
  const voidTag = tag === 'input' || tag === 'img'
  const el = (attrs) => voidTag ? open(attrs) : `${open(attrs)}${children}</${tag}>`
  // 小程序里 wx:for 先于 wx:if（逐项判断）；Vue 里 v-if 先于 v-for，所以两者同在时拆成两层
  if (loop && cond) {
    const loopAttrs = out.filter((x) => x.startsWith('v-for') || x.startsWith(':key'))
    const rest = out.filter((x) => !(x.startsWith('v-for') || x.startsWith(':key')))
    return `<template ${loopAttrs.join(' ')}>${el([cond, ...rest])}</template>`
  }
  return el(cond ? [cond, ...out] : out)
}

const view = ast.children.map((c) => render(c)).join('')
fs.writeFileSync(path.join(OUT, 'view.js'), `// 由 scripts/sync-miniprogram.mjs 从小程序 index.wxml 生成，不要手改\nwindow.__mpView = ${JSON.stringify(view)}\n`)

console.log(`modules ${modules.size}, view ${view.length} chars, css ${css.length} chars → ${path.relative(process.cwd(), OUT)}`)
