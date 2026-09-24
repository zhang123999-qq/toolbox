import type { ReactNode } from 'react'
import { CATEGORIES } from '@toolbox/catalog'

interface Highlight {
  readonly id: string
  readonly title: string
  readonly body: string
  readonly icon: ReactNode
}

/** 通用描边图标（占位视觉，后续可换成图标库） */
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

const HIGHLIGHTS: readonly Highlight[] = [
  {
    id: 'local',
    title: '数据不上传',
    body: '所有计算都在你的浏览器里完成，输入内容不会离开本机，也不会写入任何服务端日志。',
    icon: (
      <Icon>
        <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />
        <path d="M9 12l2 2 4-4" />
      </Icon>
    ),
  },
  {
    id: 'no-signup',
    title: '免登录即用',
    body: '打开页面就能用，没有注册流程、没有配额限制，也不要求绑定任何账号。',
    icon: (
      <Icon>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
      </Icon>
    ),
  },
  {
    id: 'offline',
    title: '可离线使用',
    body: '核心工具不依赖网络请求，装到桌面或断网环境下依然可以正常干活。',
    icon: (
      <Icon>
        <path d="M4 7a8 8 0 0116 0" />
        <path d="M7 11a5 5 0 0110 0" />
        <circle cx="12" cy="17" r="1.5" />
      </Icon>
    ),
  },
  {
    id: 'coverage',
    title: `覆盖 ${CATEGORIES.length} 个域`,
    body: '从文本、编码、数据格式到图片、PDF、数学与教育，按域归类，找工具不用翻菜单。',
    icon: (
      <Icon>
        <rect x="4" y="4" width="7" height="7" rx="1.5" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" />
        <rect x="13" y="13" width="7" height="7" rx="1.5" />
      </Icon>
    ),
  },
]

/** 核心亮点：产品定位的四条硬价值 */
export function Highlights() {
  return (
    <section data-testid="highlights" aria-labelledby="highlights-title">
      <h2 id="highlights-title" className="text-lg font-semibold">
        为什么用它
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {HIGHLIGHTS.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <div className="text-brand">{item.icon}</div>
            <h3 className="mt-3 font-medium">{item.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
