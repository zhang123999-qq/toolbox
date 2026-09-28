/**
 * kv-config（#807）核心逻辑：KV 绑定名 / 命名空间 ID 校验与 wrangler.toml 片段生成。
 * 纯函数，无 DOM / 网络依赖，可在 Node 下单测。
 */

export interface KvOptions {
  binding: string
  id: string
  previewId?: string
}

const BINDING_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/
const NAMESPACE_ID_RE = /^[0-9a-f]{32}$/i

/** 绑定名须为合法 JS 标识符（Worker 代码中以 env.<binding> 访问） */
export function validateKvBinding(binding: string): void {
  if (binding.trim() === '') throw new Error('绑定名不能为空')
  if (!BINDING_RE.test(binding)) {
    throw new Error('绑定名须为合法 JS 标识符（字母 / _ / $ 开头，后接字母、数字、_、$）')
  }
}

/** KV 命名空间 ID 为 32 位十六进制（wrangler kv:namespace create 输出） */
export function validateKvId(id: string, label: string): void {
  if (id.trim() === '') throw new Error(`${label}不能为空`)
  if (!NAMESPACE_ID_RE.test(id.trim())) {
    throw new Error(`${label}应为 32 位十六进制字符`)
  }
}

/** 生成 wrangler.toml 的 [[kv_namespaces]] 片段 */
export function buildKvConfig(opts: KvOptions): string {
  validateKvBinding(opts.binding)
  validateKvId(opts.id, '命名空间 ID')
  const lines = ['[[kv_namespaces]]', `binding = "${opts.binding}"`, `id = "${opts.id.trim()}"`]
  const preview = (opts.previewId ?? '').trim()
  if (preview !== '') {
    validateKvId(preview, '预览命名空间 ID')
    lines.push(`preview_id = "${preview}"`)
  }
  return lines.join('\n') + '\n'
}

export const EXAMPLE_KV_ID = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
