import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { R2ConfigInput } from './schema'
import { buildR2Config } from './utils'

function buildToml(input: R2ConfigInput): string {
  return buildR2Config({
    bucketName: input.text,
    binding: input.binding.trim(),
    previewBucketName: input.previewBucketName,
  })
}

export default function Tool() {
  return (
    <MultiPanel<R2ConfigInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: 'my-bucket', binding: 'BUCKET', previewBucketName: '' }}
      initialOptions={{}}
      example={{ text: 'my-bucket', binding: 'BUCKET', previewBucketName: 'my-bucket-preview' }}
      extraInputs={[
        { key: 'binding', label: '绑定名', rows: 1 },
        { key: 'previewBucketName', label: '预览存储桶名称（可选）', rows: 1 },
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
              <p data-testid="r2-error" className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
            {toml !== '' && (
              <pre data-testid="r2-toml" className="whitespace-pre-wrap font-mono text-xs">
                {toml}
              </pre>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              说明：将片段追加到 wrangler.toml；存储桶需先用 `npx wrangler r2 bucket create
              &lt;桶名&gt;` 创建；preview_bucket_name 用于本地预览，可选。
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
