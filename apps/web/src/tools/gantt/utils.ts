import type { Translate } from '../../i18n'
import { inputSchema } from './schema'

/** Mermaid 源码长度上限（字符）：超出后截断并在 UI 提示，避免超大代码拖慢渲染 */
export const MAX_CODE_LENGTH = 20_000

/** 本工具只渲染甘特图：首个非空行必须精确等于该指令 */
export const MERMAID_DIRECTIVE = 'gantt'

/** 内置示例（3 个）：「示例」按钮填入第 1 个，全部示例见 README */
export const EXAMPLES: readonly string[] = [
  `gantt
    title 项目排期示例
    dateFormat YYYY-MM-DD
    section 需求
    需求评审      :done,    des1, 2026-10-01, 2026-10-03
    原型设计      :active,  des2, 2026-10-04, 3d
    section 开发
    后端开发      :         dev1, 2026-10-07, 10d
    前端开发      :         dev2, after dev1, 8d
    section 测试
    联调测试      :         test1, after dev2, 5d`,
  `gantt
    title 带里程碑与关键路径
    dateFormat YYYY-MM-DD
    section 里程碑
    需求冻结      :milestone, m1, 2026-11-01, 0d
    上线          :milestone, m2, 2026-12-15, 0d
    section 研发
    核心功能      :crit,    c1, 2026-11-01, 20d
    边缘功能      :         c2, 2026-11-10, 15d
    回归测试      :crit,    c3, after c1, 10d`,
  `gantt
    title 排除周末的排期
    dateFormat YYYY-MM-DD
    excludes weekends
    section 阶段一
    任务 A        :a1, 2026-10-12, 5d
    任务 B        :a2, after a1, 5d
    section 阶段二
    任务 C        :b1, 2026-10-26, 7d`,
]

/** prepareCode 的返回：截断后的代码与是否发生截断 */
export interface PreparedCode {
  readonly code: string
  readonly truncated: boolean
}

/**
 * 预处理用户输入：Zod 校验 → 去首尾空白 → 超长截断。
 * 空输入返回空 code（UI 显示引导文案，不视为错误）；
 * 特殊字符原样保留，不做任何转义或删减（渲染层由 mermaid 按 strict 安全级别处理）。
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
 * 校验 Mermaid 甘特图代码（错误信息走 i18n，中英双语）：
 * - 空代码 → 提示输入
 * - 首行指令不是 gantt → 提示期望的指令
 * 更深层的语法校验交给 mermaid.render，失败时 UI 统一展示双语错误。
 */
export function validateDiagram(code: string, t: Translate): void {
  const firstLine = firstNonEmptyLine(code)
  if (firstLine === '') {
    throw new Error(t('gantt.error.emptyCode'))
  }
  if (firstLine !== MERMAID_DIRECTIVE) {
    throw new Error(
      t('mermaid.error.wrongDirective', { expected: MERMAID_DIRECTIVE, actual: firstLine }),
    )
  }
}
