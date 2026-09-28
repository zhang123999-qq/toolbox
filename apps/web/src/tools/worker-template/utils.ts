/**
 * worker-template（#806）核心逻辑：Worker 名称校验、路由文本解析与代码模板生成。
 * 纯函数，无 DOM / 网络依赖，可在 Node 下单测。
 */

export type WorkerFeature = 'router' | 'kv' | 'd1' | 'r2' | 'cron'

export interface WorkerRoute {
  path: string
  method: string
}

export interface WorkerOptions {
  name: string
  features: WorkerFeature[]
  routes: WorkerRoute[]
  cronSchedule?: string
}

const WORKER_NAME_RE = /^[a-z0-9][a-z0-9-]*$/
const ROUTE_LINE_RE = /^([A-Za-z]+)\s+(\S+)\s*$/

/** Worker 名称规则：小写字母/数字/连字符，以字母或数字开头，不超过 63 字符 */
export function validateWorkerName(name: string): void {
  if (name.trim() === '') throw new Error('Worker 名称不能为空')
  if (name.length > 63) throw new Error('Worker 名称不能超过 63 个字符')
  if (!WORKER_NAME_RE.test(name)) {
    throw new Error('Worker 名称只能包含小写字母、数字与连字符，且以字母或数字开头')
  }
}

/**
 * 解析路由文本：每行「METHOD /path」，空行与 # 开头注释行跳过。
 * 方法名统一转大写。
 */
export function parseRoutesText(text: string): WorkerRoute[] {
  const routes: WorkerRoute[] = []
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line === '' || line.startsWith('#')) continue
    const m = ROUTE_LINE_RE.exec(line)
    if (!m) throw new Error(`第 ${i + 1} 行路由格式非法，应为「METHOD /path」，如 GET /api/users`)
    routes.push({ method: m[1].toUpperCase(), path: m[2] })
  }
  return routes
}

function dedupe<T>(arr: readonly T[]): T[] {
  return [...new Set(arr)]
}

/**
 * 生成 worker.js 模板代码。
 * - router：按 routes 生成 handleRouteN 函数与分发分支
 * - kv/d1/r2：在 Env 接口中声明对应绑定
 * - cron：生成 scheduled 处理器（需同时给出 cronSchedule）
 */
export function generateWorker(opts: WorkerOptions): string {
  validateWorkerName(opts.name)
  const features = dedupe(opts.features)
  const cronSchedule = (opts.cronSchedule ?? '').trim()
  if (features.includes('cron') && cronSchedule === '') {
    throw new Error('启用 cron 特性时必须填写 cron 表达式（如 */5 * * * *）')
  }

  const out: string[] = []
  out.push('/**')
  out.push(` * ${opts.name} —— Cloudflare Worker 模板`)
  out.push(' * 由 toolbox 生成，可直接放入 worker.js 使用')
  out.push(' */')
  out.push('')

  const bindings: string[] = []
  if (features.includes('kv')) bindings.push('  MY_KV: KVNamespace')
  if (features.includes('d1')) bindings.push('  DB: D1Database')
  if (features.includes('r2')) bindings.push('  BUCKET: R2Bucket')
  out.push('interface Env {')
  if (bindings.length > 0) out.push(...bindings)
  else out.push('  // 暂无绑定')
  out.push('}')
  out.push('')

  const useRouter = features.includes('router') && opts.routes.length > 0
  if (useRouter) {
    opts.routes.forEach((r, i) => {
      out.push(`async function handleRoute${i}(request: Request, _env: Env): Promise<Response> {`)
      out.push(`  // ${r.method} ${r.path}`)
      out.push(`  return Response.json({ ok: true, route: ${i} })`)
      out.push('}')
      out.push('')
    })
  }

  out.push('export default {')
  out.push('  async fetch(request: Request, env: Env): Promise<Response> {')
  out.push('    const url = new URL(request.url)')
  if (useRouter) {
    opts.routes.forEach((r, i) => {
      out.push(`    if (url.pathname === '${r.path}' && request.method === '${r.method}') {`)
      out.push(`      return handleRoute${i}(request, env)`)
      out.push('    }')
    })
  }
  out.push(`    return new Response('[${opts.name}] Not Found', { status: 404 })`)
  out.push('  },')
  if (features.includes('cron')) {
    out.push('  async scheduled(event: ScheduledEvent, _env: Env): Promise<void> {')
    out.push(`    // cron 表达式: ${cronSchedule}`)
    out.push("    console.log('scheduled at', event.cron)")
    out.push('  },')
  }
  out.push('}')
  return out.join('\n') + '\n'
}

export const EXAMPLE_ROUTES = ['# 每行「METHOD /path」', 'GET /api/users', 'POST /api/users'].join(
  '\n',
)
