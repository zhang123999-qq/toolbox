import React from 'react'
import { sanitizeHtml } from './sanitizeHtml'

/**
 * SafeHtml：全应用唯一允许使用 dangerouslySetInnerHTML 的组件。
 * B 类（自生成标记）工具以 `trusted` 方式显式声明信任，
 * A 类（真 HTML 汇）工具必须先经 sanitizeHtml 再传入 `html`。
 *
 * 安全修复（此前版本对非 trusted 内容不做任何清洗、且 trusted 只要为真值即绕过）：
 * - 非 trusted 路径在组件内部强制走 DOMPurify（sanitizeHtml），调用方传什么都先洗一遍；
 * - trusted 必须严格等于 `true`（`=== true`），字符串 "false" 等真值绕过不再生效；
 * - trusted 仅用于「本地生成的 SVG/二维码标记」等已确认的 B 类汇，新增调用请优先走清洗路径。
 */
export interface SafeHtmlProps {
  html: string
  trusted?: boolean
  'data-testid'?: string
  className?: string
}

export const SafeHtml: React.FC<SafeHtmlProps> = ({
  html,
  trusted = false,
  'data-testid': dataTestId,
  className,
}) => {
  const safeHtml = trusted === true ? html : sanitizeHtml(html)
  return (
    <div
      data-testid={dataTestId}
      className={className}
      // eslint-disable-next-line no-restricted-syntax
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  )
}
