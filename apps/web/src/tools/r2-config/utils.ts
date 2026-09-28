/**
 * r2-config（#809）核心逻辑：R2 桶名 / 绑定名校验与 wrangler.toml 片段生成。
 * 纯函数，无 DOM / 网络依赖，可在 Node 下单测。
 */

export interface R2Options {
  bucketName: string
  binding: string
  previewBucketName?: string
}

const BINDING_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/
/** R2 桶命名：3–63 字符，小写字母/数字/连字符/点，首尾为字母或数字 */
const BUCKET_RE = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/

/** 绑定名须为合法 JS 标识符（Worker 代码中以 env.<binding> 访问） */
export function validateR2Binding(binding: string): void {
  if (binding.trim() === '') throw new Error('绑定名不能为空')
  if (!BINDING_RE.test(binding)) {
    throw new Error('绑定名须为合法 JS 标识符（字母 / _ / $ 开头，后接字母、数字、_、$）')
  }
}

/** R2 桶命名规则校验 */
export function validateBucketName(name: string, label: string): void {
  if (name.trim() === '') throw new Error(`${label}不能为空`)
  const n = name.trim()
  if (n.length < 3 || n.length > 63) throw new Error(`${label}长度须为 3–63 个字符`)
  if (!BUCKET_RE.test(n)) {
    throw new Error(`${label}只能包含小写字母、数字、连字符与点，且以字母或数字开头和结尾`)
  }
  if (n.includes('..')) throw new Error(`${label}不能包含连续的点`)
}

/** 生成 wrangler.toml 的 [[r2_buckets]] 片段 */
export function buildR2Config(opts: R2Options): string {
  validateR2Binding(opts.binding)
  validateBucketName(opts.bucketName, '存储桶名称')
  const lines = [
    '[[r2_buckets]]',
    `binding = "${opts.binding}"`,
    `bucket_name = "${opts.bucketName.trim()}"`,
  ]
  const preview = (opts.previewBucketName ?? '').trim()
  if (preview !== '') {
    validateBucketName(preview, '预览存储桶名称')
    lines.push(`preview_bucket_name = "${preview}"`)
  }
  return lines.join('\n') + '\n'
}
