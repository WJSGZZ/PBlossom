// 电脑上（宽于 1100px）的两栏排版：各页的卡片分到左右两栏（分栏写在 web.css），
// 两栏各自从上往下排，互不牵连——用 4px 一行的网格，按每张卡片的实际高度设置它占几行（瀑布流）。
(function () {
  const wide = window.matchMedia('(min-width: 1100px)')
  const ROW = 4
  const GAP = 24

  function layout() {
    document.querySelectorAll('.page > .stack').forEach((stack) => {
      const kids = [...stack.children]
      // 只有瀑布流的页面（行高 4px 的网格）才按高度设置跨行
      if (!wide.matches || getComputedStyle(stack).gridAutoRows !== `${ROW}px`) {
        kids.forEach((el) => { el.style.gridRowEnd = '' })
        return
      }
      kids.forEach((el) => {
        const h = el.getBoundingClientRect().height
        el.style.gridRowEnd = `span ${Math.max(1, Math.ceil((h + GAP) / ROW))}`
      })
    })
  }

  let pending = false
  const schedule = () => {
    if (pending) return
    pending = true
    requestAnimationFrame(() => { pending = false; layout() })
  }
  const ro = new ResizeObserver(schedule)
  const seen = new WeakSet()
  new MutationObserver(() => {
    document.querySelectorAll('.page > .stack > *').forEach((el) => { if (!seen.has(el)) { seen.add(el); ro.observe(el) } })
    schedule()
  }).observe(document.getElementById('app'), { childList: true, subtree: true })
  wide.addEventListener('change', schedule)
  window.addEventListener('resize', schedule)
  schedule()
})()
