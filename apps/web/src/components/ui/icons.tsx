/**
 * 通用图标（描边风格，currentColor 取色）
 *
 * 只放「多处复用」的图标；区块专属图标仍就近定义在各自组件里。
 * 统一 aria-hidden，可访问名一律由宿主元素的 aria-label 提供。
 */
import type { SVGProps } from 'react'

function Base({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4.5-4.5" />
    </Base>
  )
}

/** 月亮：当前为浅色主题时显示，暗示「点击进入深色」 */
export function MoonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z" />
    </Base>
  )
}

/** 太阳：当前为深色主题时显示，暗示「点击回到浅色」 */
export function SunIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
    </Base>
  )
}
