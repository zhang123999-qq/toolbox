import type { SocialShareInput, SocialShareOptions } from './schema'

/** 支持的分享平台：顺序即输出顺序 */
export const PLATFORMS = [
  { id: 'x', name: 'X', nameEn: 'X (Twitter)' },
  { id: 'facebook', name: 'Facebook', nameEn: 'Facebook' },
  { id: 'linkedin', name: 'LinkedIn', nameEn: 'LinkedIn' },
  { id: 'weibo', name: '微博', nameEn: 'Weibo' },
  { id: 'telegram', name: 'Telegram', nameEn: 'Telegram' },
  { id: 'whatsapp', name: 'WhatsApp', nameEn: 'WhatsApp' },
  { id: 'reddit', name: 'Reddit', nameEn: 'Reddit' },
  { id: 'email', name: '邮件', nameEn: 'Email' },
] as const

export type PlatformId = (typeof PLATFORMS)[number]['id']

/**
 * 校验要分享的 URL：去首尾空白 → 必须 http(s) 开头 → URL 合法。
 * 返回规范化后的 href（new URL 会补斜杠、规范化大小写等）。
 */
export function assertShareUrl(url: string): string {
  const trimmed = url.trim()
  if (trimmed === '') throw new Error('请输入要分享的 URL，例如 https://example.com/article')
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error('URL 必须以 http:// 或 https:// 开头')
  }
  try {
    return new URL(trimmed).href
  } catch {
    throw new Error('URL 格式不正确，请检查后重试')
  }
}

/**
 * 逐平台拼分享链接（纯函数）。
 * 所有参数都经 encodeURIComponent 编码；title / text 为空时省略对应的可选参数。
 */
export function buildShareLinks(args: {
  url: string
  title?: string
  text?: string
}): Record<PlatformId, string> {
  const url = args.url
  const title = args.title ?? ''
  const text = args.text ?? ''
  const u = encodeURIComponent(url)

  const xText = title === '' ? '' : `&text=${encodeURIComponent(title)}`
  const weiboTitle = title === '' ? '' : `&title=${encodeURIComponent(title)}`
  // telegram 的文案优先用摘要，没有摘要才用标题
  const tgText = text === '' ? title : text
  const telegramText = tgText === '' ? '' : `&text=${encodeURIComponent(tgText)}`
  const redditTitle = title === '' ? '' : `&title=${encodeURIComponent(title)}`
  // whatsapp 把「标题 + 空格 + 链接」整体编码一次
  const waText = title === '' ? url : `${title} ${url}`
  // 邮件正文 = 摘要 + 换行 + 链接；无摘要时只有链接
  const emailBody = text === '' ? url : `${text}\n${url}`
  const emailSubject = title === '' ? '' : `subject=${encodeURIComponent(title)}&`

  return {
    x: `https://twitter.com/intent/tweet?url=${u}${xText}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    weibo: `https://service.weibo.com/share/share.php?url=${u}${weiboTitle}`,
    telegram: `https://t.me/share/url?url=${u}${telegramText}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(waText)}`,
    reddit: `https://www.reddit.com/submit?url=${u}${redditTitle}`,
    email: `mailto:?${emailSubject}body=${encodeURIComponent(emailBody)}`,
  }
}

/** 把 8 条链接渲染成纯文本「平台名：URL」每行一条（供输出区 / 复制 / 下载） */
export function renderLinks(links: Record<PlatformId, string>): string {
  return PLATFORMS.map((p) => `${p.name}：${links[p.id]}`).join('\n')
}

/** 校验 URL → 拼 8 平台链接 → 渲染文本；空输入直接返回空串 */
export function transform(input: SocialShareInput, options: SocialShareOptions): string {
  if (input.text.trim() === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  const url = assertShareUrl(input.text)
  return renderLinks(
    buildShareLinks({ url, title: options.shareTitle, text: options.shareText }),
  )
}
