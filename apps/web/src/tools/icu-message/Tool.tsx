import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { ExtraInputDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { extractPlaceholders, parseIcu, previewIcu } from './utils'
import type { IcuMessageInput, IcuMessageOptions } from './schema'

/** 示例：复数消息 */
const EXAMPLE: IcuMessageInput = {
  text: '{n, plural, =0{没有消息} =1{一条消息} other{# 条消息}}',
  values: '{"n": 5}',
}

const extraInputs: readonly ExtraInputDef[] = [{ key: 'values', label: '变量取值（JSON 对象）', rows: 5 }]

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'

function parseValues(raw: string): Record<string, string | number> {
  const text = raw.trim() === '' ? '{}' : raw
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('变量取值不是合法的 JSON')
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('变量取值必须是 JSON 对象')
  }
  return parsed as Record<string, string | number>
}

function compute(input: IcuMessageInput): { preview: string; placeholders: string[]; nodeCount: number } {
  const text = input.text.trim() === '' ? EXAMPLE.text : input.text
  const values = parseValues(input.values)
  const preview = previewIcu(text, values)
  const placeholders = extractPlaceholders(text)
  const nodeCount = parseIcu(text).length
  return { preview, placeholders, nodeCount }
}

function toText(input: IcuMessageInput): string {
  try {
    const { preview, placeholders, nodeCount } = compute(input)
    const lines = [
      `渲染结果：${preview}`,
      `占位变量（${placeholders.length}）：${placeholders.length === 0 ? '无' : placeholders.join(', ')}`,
      `语法节点数：${nodeCount}`,
    ]
    return lines.join('\n')
  } catch (e) {
    return `解析失败：${e instanceof Error ? e.message : String(e)}`
  }
}

export default function Tool() {
  function renderOutput(input: IcuMessageInput) {
    try {
      const { preview, placeholders, nodeCount } = compute(input)
      return (
        <div data-testid="results" className="space-y-2">
          <p data-testid="result-preview" className="text-base break-all">
            {preview}
          </p>
          <p data-testid="result-placeholders" className="font-mono text-xs break-all">
            占位变量（{placeholders.length}）：{placeholders.length === 0 ? '无' : placeholders.join(', ')}
          </p>
          <p data-testid="result-nodes" className="text-xs text-gray-500">
            语法节点数：{nodeCount}
          </p>
        </div>
      )
    } catch (e) {
      return (
        <p role="alert" className={ERROR_CLASS}>
          {e instanceof Error ? e.message : String(e)}
        </p>
      )
    }
  }

  return (
    <MultiPanel<IcuMessageInput, IcuMessageOptions>
      meta={meta}
      initialInput={{ text: '', values: '' }}
      initialOptions={{}}
      example={EXAMPLE}
      extraInputs={extraInputs}
      renderOutput={renderOutput}
      toText={toText}
      downloadExt="txt"
    />
  )
}
