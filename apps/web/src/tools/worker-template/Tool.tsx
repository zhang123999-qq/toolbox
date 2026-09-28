import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { WorkerTemplateInput, WorkerTemplateOptions } from './schema'
import { EXAMPLE_ROUTES, generateWorker, parseRoutesText, type WorkerFeature } from './utils'

const FEATURE_DEFS: { key: WorkerFeature; label: string }[] = [
  { key: 'router', label: '路由分发' },
  { key: 'kv', label: 'KV 绑定' },
  { key: 'd1', label: 'D1 绑定' },
  { key: 'r2', label: 'R2 绑定' },
  { key: 'cron', label: 'Cron 定时' },
]

function buildCode(input: WorkerTemplateInput, options: WorkerTemplateOptions): string {
  const features = FEATURE_DEFS.filter((f) => options[f.key]).map((f) => f.key)
  const routes = parseRoutesText(input.text)
  return generateWorker({
    name: input.name.trim(),
    features,
    routes,
    cronSchedule: input.cronSchedule,
  })
}

export default function Tool() {
  return (
    <MultiPanel<WorkerTemplateInput, WorkerTemplateOptions>
      meta={meta}
      initialInput={{ text: EXAMPLE_ROUTES, name: 'my-worker', cronSchedule: '' }}
      initialOptions={{ router: true, kv: false, d1: false, r2: false, cron: false }}
      example={{ text: EXAMPLE_ROUTES, name: 'my-worker', cronSchedule: '*/5 * * * *' }}
      extraInputs={[
        { key: 'name', label: 'Worker 名称', rows: 1 },
        { key: 'cronSchedule', label: 'Cron 表达式（启用 Cron 定时时必填）', rows: 1 },
      ]}
      optionDefs={FEATURE_DEFS.map((f) => ({
        key: f.key,
        label: f.label,
        kind: 'boolean' as const,
      }))}
      renderOutput={(input, options) => {
        let code = ''
        let error = ''
        try {
          code = buildCode(input, options)
        } catch (err) {
          error = err instanceof Error ? err.message : '生成失败'
        }
        return (
          <div className="flex flex-col gap-3">
            {error !== '' && (
              <p data-testid="worker-error" className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
            {code !== '' && (
              <pre data-testid="worker-code" className="whitespace-pre-wrap font-mono text-xs">
                {code}
              </pre>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              说明：生成的 worker.js 可直接使用；KV / D1 / R2 绑定需在 wrangler.toml 中声明
              （可用本站 KV 配置 / D1 配置 / R2 配置工具生成）；cron 表达式需同步写入 wrangler.toml
              的 [triggers] crons。
            </p>
          </div>
        )
      }}
      toText={(input, options) => {
        try {
          return buildCode(input, options)
        } catch {
          return ''
        }
      }}
      downloadExt="js"
    />
  )
}
