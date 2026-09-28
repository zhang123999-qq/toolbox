import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { KvConfigInput } from './schema'
import { buildKvConfig, EXAMPLE_KV_ID } from './utils'

function buildToml(input: KvConfigInput): string {
  return buildKvConfig({
    binding: input.text.trim(),
    id: input.namespaceId,
    previewId: input.previewId,
  })
}

export default function Tool() {
  return (
    <MultiPanel<KvConfigInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: 'MY_KV', namespaceId: EXAMPLE_KV_ID, previewId: '' }}
      initialOptions={{}}
      example={{ text: 'MY_KV', namespaceId: EXAMPLE_KV_ID, previewId: EXAMPLE_KV_ID }}
      extraInputs={[
        { key: 'namespaceId', label: '命名空间 ID（32 位十六进制）', rows: 1 },
        { key: 'previewId', label: '预览命名空间 ID（可选）', rows: 1 },
      ]}
      renderOutput={(input) => {
        let toml = ''
        let error = ''
        try {
          toml = buildToml(input)
        } catch (err) {
          error = err instanceof Error ? err.message : '生成失败'
        }
        return (
          <div className="flex flex-col gap-3">
            {error !== '' && (
              <p data-testid="kv-error" className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
            {toml !== '' && (
              <pre data-testid="kv-toml" className="whitespace-pre-wrap font-mono text-xs">
                {toml}
              </pre>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              说明：将片段追加到 wrangler.toml；命名空间 ID 来自 `npx wrangler kv:namespace create
              &lt;名称&gt;` 的输出；preview_id 用于 `wrangler dev` 本地预览，可选。
            </p>
          </div>
        )
      }}
      toText={(input) => {
        try {
          return buildToml(input)
        } catch {
          return ''
        }
      }}
      downloadExt="toml"
    />
  )
}
