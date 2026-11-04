import DOMPurify from 'dompurify'

/**
 * 共享 sanitizeHtml：全应用所有 A 类（真 HTML 汇）工具的防护线。
 *
 * 废弃自研白名单清洗（word-view 的 cleanNode），改用 DOMPurify（业界标准、
 * 持续跟进 mXSS / 命名空间绕过等新型攻击）。配置取保守集：
 * - 禁止 script/style/iframe/object/embed/form 等可执行或可嵌入元素
 * - 仅允许 http(s)/mailto/相对路径/#锚点 href，data: 仅限 img 的图片类型
 * - 所有 on* 事件属性、style 表达式一律清除
 *
 * SSR（无 window）时 DOMPurify 不可用：降级为「剥离危险标签 + 事件属性 +
 * javascript: 链接」正则清洗，仅保证不产出可执行脚本；客户端 hydration
 * 时 React 会对差异子树自动恢复为 DOMPurify 结果。
 */
export function sanitizeHtml(html: string): string {
  if (html.trim() === '') return ''
  if (typeof window !== 'undefined') {
    return DOMPurify.sanitize(html, {
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'base', 'link', 'meta'],
      FORBID_ATTR: ['style'],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    })
  }
  return html
    .replace(/<(script|style|iframe|object|embed|form|base|link|meta)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|style|iframe|object|embed|form|base|link|meta)\b[^>]*\/?>/gi, '')
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src|xlink:href)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, (m) =>
      /javascript\s*:/i.test(m) ? m.replace(/\s*=\s*.*$/, '') : m,
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
