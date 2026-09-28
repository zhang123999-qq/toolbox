import { inputSchema } from './schema'

/** Mermaid 源码长度上限（字符）：超出后截断并在 UI 提示 */
export const MAX_CODE_LENGTH = 20_000

/** 本工具只渲染思维导图：首个非空行必须以该指令开头 */
export const MERMAID_DIRECTIVE = 'mindmap'

/** 内置示例 */
export const EXAMPLES: readonly string[] = [
  `mindmap
  root((项目规划))
    需求
      用户调研
      竞品分析
      功能清单
    设计
      原型图
      视觉稿
    开发
      前端
      后端
      测试`,
  `mindmap
  root((学习路线))
    基础
      语文
      数学
      英语
    进阶
      物理
      化学
    拓展
      编程
      写作`,
]

/** prepareCode 的返回：截断后的代码与是否发生截断 */
export interface PreparedCode {
  readonly code: string
  readonly truncated: boolean
}

/**
 * 预处理用户输入：Zod 校验 → 去首尾空白 → 超长截断。
 * 空输入返回空 code（UI 显示引导文案，不视为错误）。
 */
export function prepareCode(raw: string): PreparedCode {
  const parsed = inputSchema.parse({ text: raw })
  const code = parsed.text.trim()
  if (code.length <= MAX_CODE_LENGTH) {
    return { code, truncated: false }
  }
  return { code: code.slice(0, MAX_CODE_LENGTH), truncated: true }
}

/** 取首个非空行（去空白后）；全空返回空串 */
function firstNonEmptyLine(code: string): string {
  for (const line of code.split('\n')) {
    const trimmed = line.trim()
    if (trimmed !== '') return trimmed
  }
  return ''
}

/**
 * 校验 Mermaid mindmap 代码（错误信息内联中文）：
 * - 空代码 → 提示输入
 * - 首行指令不是 mindmap → 提示期望的指令
 * 更深层的语法校验交给 mermaid.render，失败时 UI 统一展示错误。
 */
export function validate(code: string): void {
  const firstLine = firstNonEmptyLine(code)
  if (firstLine === '') {
    throw new Error('代码为空，请输入 Mermaid mindmap 代码')
  }
  if (!firstLine.startsWith(MERMAID_DIRECTIVE)) {
    throw new Error(`首行应为 "${MERMAID_DIRECTIVE}"，当前为 "${firstLine}"`)
  }
}
