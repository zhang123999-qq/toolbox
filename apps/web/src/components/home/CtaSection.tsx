import { Link } from 'react-router-dom'

/** 底部转化区：引导进入工具列表与搜索 */
export function CtaSection() {
  return (
    <section
      data-testid="cta"
      className="rounded-2xl border border-slate-200 bg-white p-6 text-center md:p-10"
    >
      <h2 className="text-xl font-semibold">直接开始用，不用先注册</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
        占位文案：这里将补充说明典型使用场景与上手路径。
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          to="/tools"
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          进入工具列表
        </Link>
        <Link
          to="/c/dev"
          className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          先看开发编码类
        </Link>
      </div>
    </section>
  )
}
