import DOMPurify from 'dompurify'

/**
 * 共享 sanitizeHtml：全应用所有 A 类（真 HTML 汇）工具的防护线。
 *
 * 废弃自研白名单清洗（word-view 的 cleanNode），改用 DOMPurify（业界标准、
 * 持续跟进 mXSS / 命名空间绕过等新型攻击）。配置取保守集：
 * - 禁止 script/style/iframe/object/embed/form 等可执行或可嵌入元素
 * - 仅允许 http(s)/mailto/相对路径/#锚点 href，data: 仅限
 *   data:image/(png|gif|jpeg|webp);base64,...（阻断 data:text/html 等）
 * - 所有 on* 事件属性、style 表达式一律清除
 *
 * SSR（无 window）时 DOMPurify 不可用：降级为「剥离危险标签 + 事件属性 +
 * javascript: / 非图片 data: 链接」正则清洗，仅保证不产出可执行脚本；客户端 hydration
 * 时 React 会对差异子树自动恢复为 DOMPurify 结果。
 */
/** P2：data: 仅允许四个位图图片类型的 base64 内嵌（阻断 data:text/html、data:image/svg+xml 等）。 */
const DATA_IMAGE_RE = /^data:image\/(?:png|gif|jpeg|webp);base64,[A-Za-z0-9+/=]+$/i
const ALLOWED_URI_REGEXP =
  /^(?:(?:https?|mailto|tel):|data:image\/(?:png|gif|jpeg|webp);base64,[A-Za-z0-9+/=]+|[^a-z]|[a-z+.-]+(?:[^a-z+.:-]|$))/i

// DOMPurify 对 img/audio/video/source/image/track 的 data: URI 有放行旁路
// （不走 ALLOWED_URI_REGEXP），需用 hook 补齐上下一致的检查，否则 data:text/html 仍会混入 img src。
let dataUriHookInstalled = false
function ensureDataUriHook(): void {
  if (dataUriHookInstalled || typeof window === 'undefined') return
  dataUriHookInstalled = true
  DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
    if (/^\s*data:/i.test(data.attrValue) && !DATA_IMAGE_RE.test(data.attrValue.trim())) {
      data.keepAttr = false
    }
    void node
  })
}

export function sanitizeHtml(html: string): string {
  if (html.trim() === '') return ''
  if (typeof window !== 'undefined') {
    ensureDataUriHook()
    return DOMPurify.sanitize(html, {
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'base', 'link', 'meta'],
      FORBID_ATTR: ['style'],
      ALLOWED_URI_REGEXP,
    })
  }
  return html
    .replace(/<(script|style|iframe|object|embed|form|base|link|meta)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|style|iframe|object|embed|form|base|link|meta)\b[^>]*\/?>/gi, '')
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src|xlink:href)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, (m) =>
      /javascript\s*:/i.test(m) || /data:(?!image\/(?:png|gif|jpeg|webp);base64,)/i.test(m)
        ? m.replace(/\s*=\s*.*$/, '')
        : m,
    )
}

/** HTML 转义：用于文件名等插入文档 <title> 的文本 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
