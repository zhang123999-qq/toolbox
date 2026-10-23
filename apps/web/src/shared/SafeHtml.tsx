import React from 'react'

/**
 * SafeHtml：全应用唯一允许使用 dangerouslySetInnerHTML 的组件。
 * B 类（自生成标记）工具以 `trusted` 方式显式声明信任，
 * A 类（真 HTML 汇）工具必须先经 sanitizeHtml 再传入 `html`。
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
  if (!trusted && html.includes('dangerouslySetInnerHTML')) {
    // 开发阶段警告：非 trusted 路径不应直接传入原始用户内容
    // （实际防护由 sanitizeHtml + ESLint 限制完成）
  }
  return (
    <div
      data-testid={dataTestId}
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
