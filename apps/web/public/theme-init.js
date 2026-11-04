/**
 * 首帧前的偏好应用（必须先于任何渲染执行，否则会出现主题/语言闪动）。
 * 由 index.html 以 <script src="/theme-init.js"></script> 引入，
 * 不使用内联脚本，以满足严格 CSP（script-src 'self'，无 'unsafe-inline'）。
 *
 * ⚠️ 这里的 localStorage key 与 apps/web/src/lib/prefs.ts 必须一致：
 *    toolbox.locale = 'zh' | 'en'
 *    toolbox.theme  = 'light' | 'dark'
 * 未存储主题时跟随系统 prefers-color-scheme。
 * 语言非默认（非中文）时挂上 i18n-pending，遮住预渲染的中文内容，
 * 由 I18nProvider 就绪后摘除；3s 兜底定时器防止异常时内容被永久隐藏。
 */
;(function () {
  var root = document.documentElement
  try {
    var locale = window.localStorage.getItem('toolbox.locale')
    if (locale !== 'en' && locale !== 'zh') locale = 'zh'
    root.lang = locale === 'en' ? 'en' : 'zh-CN'
    if (locale === 'en') root.classList.add('i18n-pending')

    var theme = window.localStorage.getItem('toolbox.theme')
    var dark =
      theme === 'dark' ||
      (theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    if (dark) root.classList.add('dark')
    root.style.colorScheme = dark ? 'dark' : 'light'
  } catch (error) {
    /* 隐私模式等场景下 localStorage 不可用，回落默认值即可 */
  }
  window.setTimeout(function () {
    root.classList.remove('i18n-pending')
  }, 3000)
})()
