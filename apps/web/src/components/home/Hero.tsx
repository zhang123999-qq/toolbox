import { Link } from 'react-router-dom'
import { CATEGORIES, GROUPS, PLANNED_TOTAL_TOOLS, TOOL_COUNT } from '@toolbox/catalog'

const STATS = [
  { label: '规划工具', value: PLANNED_TOTAL_TOOLS },
  { label: '已上线', value: TOOL_COUNT },
  { label: '分类域', value: CATEGORIES.length },
  { label: '大组', value: GROUPS.length },
] as const

/**
 * 主视觉区（Hero）
 * 桌面端左右分栏，移动端上下堆叠（图在下）。
 * 图片为占位图（/images/hero-placeholder.svg），后续替换为真实插画即可。
 */
export function Hero() {
  return (
    <section
      data-testid="hero"
      className="grid items-center gap-8 rounded-2xl bg-gradient-to-b from-sky-50 to-white p-6 md:grid-cols-2 md:p-10"
    >
      <div className="text-center md:text-left">
        <p className="text-sm font-medium text-brand">纯本地 · 免登录 · 可离线</p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight md:text-4xl">
          {PLANNED_TOTAL_TOOLS} 个在线工具，
          <br className="hidden sm:block" />
          全部在你的浏览器里跑
        </h1>
        <p className="mx-auto mt-4 max-w-md text-slate-600 md:mx-0">
          文本处理、编码转换、图片编辑、PDF 操作、数学计算……打开即用，不注册、不上传，
          断网也能继续干活。
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
          <Link
            to="/tools"
            data-testid="hero-cta-primary"
            className="rounded-lg bg-brand px-5 py-2.5 text-center text-sm font-medium text-white hover:opacity-90"
          >
            浏览全部工具
          </Link>
          <Link
            to="/tools/json-formatter"
            data-testid="hero-cta-secondary"
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            试试 JSON 格式化
          </Link>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          按 <kbd className="rounded bg-white px-1 shadow-sm">⌘K</kbd> 或{' '}
          <kbd className="rounded bg-white px-1 shadow-sm">Ctrl+K</kbd> 随时全局搜索
        </p>

        <dl className="mt-8 grid grid-cols-4 gap-2">
          {STATS.map((stat) => (
            <div key={stat.label} className="rounded-lg bg-white/70 p-2 text-center">
              <dt className="text-xs text-slate-500">{stat.label}</dt>
              <dd className="text-lg font-semibold text-slate-900">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div>
        <img
          src="/images/hero-placeholder.svg"
          alt="产品主视觉占位图"
          width={640}
          height={420}
          loading="lazy"
          className="mx-auto w-full max-w-md rounded-xl"
        />
      </div>
    </section>
  )
}
