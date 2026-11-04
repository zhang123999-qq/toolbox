/**
 * 文本工具统一输入上限（P0-4）。
 * 主流文本工具经 TwoColumn / MultiPanel 模板层拦截：超限显示错误而非截断静默；
 * 独立逻辑层（如 base64-encode/utils）直接调用 checkInputLimit 抛错。
 */

/** 单个文本输入的最大字符数 */
export const MAX_INPUT = 200_000

export interface InputLimitResult {
  readonly ok: boolean
  /** 超限时的中文错误信息；ok 时为 undefined */
  readonly error?: string
}

/** 检查单个文本是否超限 */
export function checkInputLimit(str: string): InputLimitResult {
  if (str.length > MAX_INPUT) {
    return { ok: false, error: `输入过长：已超过 ${MAX_INPUT} 字符上限（当前 ${str.length} 字符）` }
  }
  return { ok: true }
}

/** 对输入对象（含 text 与 extra 附加字段）逐字段检查，返回首个超限字段结果 */
export function checkInputObject(input: Record<string, unknown>): InputLimitResult {
  for (const value of Object.values(input)) {
    if (typeof value === 'string') {
      const result = checkInputLimit(value)
      if (!result.ok) return result
    }
  }
  return { ok: true }
}
