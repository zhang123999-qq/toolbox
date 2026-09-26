import type { JsonlInput, JsonlOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class JsonlError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JsonlError'
  }
}

/** 单次处理上限：超过则拒绝，避免超大文本卡死主线程 */
export const MAX_INPUT = 1_000_000

/** 缩进档位：数组输出用两格 */
const PRETTY = 2

/** 行上限：一行一个文档，行数过多时逐行报错也看不完 */
const MAX_LINES = 200_000

/** 兼容 \n、\r\n、\r 三种换行 */
const LINE_BREAK = /\r\n|\n|\r/

/** 报错里的行内容预览长度 */
const PREVIEW = 40

/** 顶层类型名，用于逐行校验的输出 */
function typeOf(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

/** 切出行，并过滤掉 skipEmpty 时的空行（同时交回被跳过的行号，便于行号仍对齐原文） */
function splitLines(text: string): readonly string[] {
  const lines = text.split(LINE_BREAK)
  // 结尾的换行是排版习惯，不是「有一个空行」，去掉最后一条空串
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop()
  if (lines.length > MAX_LINES) {
    throw new JsonlError(`行数超过 ${MAX_LINES} 行，请分批处理`)
  }
  return lines
}

/** 报错用的行内容预览：截掉长行，避免错误信息本身占满输出区 */
function preview(line: string): string {
  const trimmed = line.trim()
  return trimmed.length <= PREVIEW ? trimmed : `${trimmed.slice(0, PREVIEW - 1)}…`
}

/** JSONL → JSON 数组：任一行不合法就整体失败，避免悄悄丢数据 */
function linesToArray(text: string, skipEmpty: boolean): string {
  const rows: unknown[] = []
  splitLines(text).forEach((line, index) => {
    const number = index + 1
    if (line.trim() === '') {
      if (!skipEmpty) throw new JsonlError(`第 ${number} 行是空行（可勾选「跳过空行」忽略）`)
      return
    }
    try {
      rows.push(JSON.parse(line))
    } catch {
      throw new JsonlError(`第 ${number} 行不是合法 JSON：${preview(line)}`)
    }
  })
  return JSON.stringify(rows, null, PRETTY)
}

/** JSON 数组 → JSONL：一行一个元素，元素内部不再换行 */
function arrayToLines(text: string): string {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new JsonlError('内容不是合法 JSON，无法转成 JSONL')
  }
  if (!Array.isArray(parsed)) {
    throw new JsonlError('内容不是 JSON 数组，只有数组才能一行一个元素地展开')
  }
  return parsed.map((item) => JSON.stringify(item)).join('\n')
}

/** 逐行校验：不抛错，把每一行归到「合法 / 空行 / 不合法」里给出清单 */
function report(text: string, skipEmpty: boolean): string {
  const lines: string[] = []
  let valid = 0
  let invalid = 0
  let blank = 0
  splitLines(text).forEach((line, index) => {
    const number = index + 1
    if (line.trim() === '') {
      blank += 1
      if (!skipEmpty) lines.push(`行 ${number}：空行`)
      return
    }
    try {
      lines.push(`行 ${number}：合法，顶层类型 ${typeOf(JSON.parse(line))}`)
      valid += 1
    } catch {
      lines.push(`行 ${number}：不合法 —— ${preview(line)}`)
      invalid += 1
    }
  })
  const head = `校验结果：合法 ${valid} 行，不合法 ${invalid} 行，空行 ${blank} 行`
  return [head, ...lines].join('\n')
}

/**
 * JSONL / NDJSON 处理 —— 纯函数，不依赖 React / DOM。
 *
 * JSONL 的每一行都是彼此独立的文档：解析时不允许「跳过坏行继续」，
 * 与其给一份缺了数据的数组让人误以为完整，不如直接报行号。
 */
export function transform(input: JsonlInput, options: JsonlOptions): string {
  if (!input.text.trim()) return ''

  if (input.text.length > MAX_INPUT) {
    throw new JsonlError(`输入超过 ${MAX_INPUT} 字符上限`)
  }

  if (options.mode === 'json2jsonl') return arrayToLines(input.text)
  if (options.mode === 'validate') return report(input.text, options.skipEmpty)
  return linesToArray(input.text, options.skipEmpty)
}
