import type { JsonToK8sOptions } from './schema'

// 自研极简 YAML 序列化（不跨工具 import）
function scalar(v: unknown): string {
  if (v === null) return 'null'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'number') return String(v)
  const s = String(v)
  if (s === '' || /[:#&*!|>'"%@`]|\s/.test(s) || /^(true|false|null|~)$/.test(s))
    return JSON.stringify(s)
  return s
}

function emitObject(obj: Record<string, unknown>, col: number, firstPrefix?: string): string[] {
  const out: string[] = []
  Object.entries(obj).forEach(([k, v], idx) => {
    const prefix = idx === 0 && firstPrefix !== undefined ? firstPrefix : ' '.repeat(col)
    if (Array.isArray(v)) {
      if (v.length === 0) {
        out.push(`${prefix}${k}: []`)
      } else {
        out.push(`${prefix}${k}:`)
        out.push(...emitArray(v, col + 2))
      }
    } else if (v !== null && typeof v === 'object') {
      if (Object.keys(v as object).length === 0) {
        out.push(`${prefix}${k}: {}`)
      } else {
        out.push(`${prefix}${k}:`)
        out.push(...emitObject(v as Record<string, unknown>, col + 2))
      }
    } else {
      out.push(`${prefix}${k}: ${scalar(v)}`)
    }
  })
  return out
}

function emitArray(arr: readonly unknown[], col: number): string[] {
  const out: string[] = []
  for (const item of arr) {
    if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
      out.push(...emitObject(item as Record<string, unknown>, col + 2, ' '.repeat(col) + '- '))
    } else {
      out.push(' '.repeat(col) + '- ' + scalar(item))
    }
  }
  return out
}

function toYaml(node: unknown): string {
  if (node === null || typeof node !== 'object') return scalar(node)
  if (Array.isArray(node)) return emitArray(node, 0).join('\n')
  return emitObject(node as Record<string, unknown>, 0).join('\n')
}

export function transform(input: { text: string }, _options: JsonToK8sOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  let root: unknown
  try {
    root = JSON.parse(input.text)
  } catch {
    throw new Error('不是合法的 JSON')
  }
  if (root === null || typeof root !== 'object' || Array.isArray(root)) {
    throw new Error('顶层必须是 K8s 资源对象（JSON object）')
  }
  const obj = root as Record<string, unknown>

  const checks: string[] = []
  checks.push(
    obj['apiVersion'] ? `✓ apiVersion: ${String(obj['apiVersion'])}` : '✗ 缺少 apiVersion',
  )
  checks.push(obj['kind'] ? `✓ kind: ${String(obj['kind'])}` : '✗ 缺少 kind')
  const meta = obj['metadata']
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    const name = (meta as Record<string, unknown>)['name']
    checks.push(name ? `✓ metadata.name: ${String(name)}` : '✗ 缺少 metadata.name')
  } else {
    checks.push('✗ 缺少 metadata 对象')
  }

  return [
    '== K8s 校验结果 ==',
    ...checks,
    '',
    '== 格式化 JSON ==',
    JSON.stringify(obj, null, 2),
    '',
    '== 等价 YAML ==',
    toYaml(obj),
  ].join('\n')
}
