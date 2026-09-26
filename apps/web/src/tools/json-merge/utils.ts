import type { JsonMergeInput, JsonMergeOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class JsonMergeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JsonMergeError'
  }
}

/** 单次处理上限：超过则拒绝，避免超大文本卡死主线程 */
export const MAX_INPUT = 1_000_000

/** 缩进档位：合并结果一律重排，便于直接入库 */
const PRETTY = 2

/** 嵌套上限：递归合并受调用栈限制 */
const MAX_DEPTH = 2_000

/** 是否普通对象（排除 null 与数组） */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 解析一侧输入，报错时带上「哪一侧」的定位信息 */
function parse(text: string, side: '基础' | '附加'): unknown {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new JsonMergeError(`${side} JSON 不合法，无法合并`)
  }
  return parsed
}

/**
 * 递归合并。走到「两边类型合不上」这一步（标量对对象、deep 模式下的对象对数组…）
 * 就不再猜语义，直接按 prefer 取舍：合并工具最忌讳悄悄改别人的取值。
 */
function mergeValues(
  base: unknown,
  extra: unknown,
  options: JsonMergeOptions,
  depth: number,
): unknown {
  if (depth > MAX_DEPTH) throw new JsonMergeError(`JSON 嵌套超过 ${MAX_DEPTH} 层，无法合并`)
  // 浅层模式只合并顶层对象；再往下的同名字段整体替换
  const containerLevel = options.mode === 'deep' ? depth : 0
  if (isPlainObject(base) && isPlainObject(extra) && depth === containerLevel) {
    const merged: Record<string, unknown> = { ...base }
    for (const key of Object.keys(extra)) {
      merged[key] =
        key in base ? mergeValues(base[key], extra[key], options, depth + 1) : extra[key]
    }
    return merged
  }
  return options.prefer === 'base' ? base : extra
}

/**
 * 合并两份 JSON —— 纯函数，不依赖 React / DOM。
 *
 * 数组不做拼接、只在冲突时整体替换：数组是有序容器，「合并」没有唯一正确答案，
 * 默认猜测会把不该合的业务数据拼在一起。
 */
export function transform(input: JsonMergeInput, options: JsonMergeOptions): string {
  if (!input.text.trim() && !input.textB.trim()) return ''

  if (input.text.length > MAX_INPUT || input.textB.length > MAX_INPUT) {
    throw new JsonMergeError(`单侧输入超过 ${MAX_INPUT} 字符上限`)
  }
  if (!input.text.trim()) throw new JsonMergeError('基础 JSON 为空，请先在左栏填写')
  if (!input.textB.trim()) throw new JsonMergeError('待并入的 JSON 为空，请先在右栏填写')

  const merged = mergeValues(parse(input.text, '基础'), parse(input.textB, '附加'), options, 0)
  return JSON.stringify(merged, null, PRETTY)
}
