import type { Translate } from '../../i18n'
import { inputSchema } from './schema'

/** Mermaid 源码长度上限（字符）：超出后截断并在 UI 提示，避免超大代码拖慢渲染 */
export const MAX_CODE_LENGTH = 20_000

/** 本工具只渲染时序图：首个非空行必须精确等于该指令 */
export const MERMAID_DIRECTIVE = 'sequenceDiagram'

/** 内置示例（3 个）：「示例」按钮填入第 1 个，全部示例见 README */
export const EXAMPLES: readonly string[] = [
  `sequenceDiagram
    participant U as 用户
    participant S as 服务端
    U->>S: 登录请求
    S-->>U: 返回 Token`,
  `sequenceDiagram
    autonumber
    participant C as 客户端
    participant O as 订单服务
    C->>O: 提交订单
    alt 库存充足
        O-->>C: 下单成功
    else 库存不足
        O-->>C: 下单失败
    end`,
  `sequenceDiagram
    participant U as 用户
    participant P as 支付网关
    U->>P: 发起支付
    loop 每 5 秒轮询一次
        U->>P: 查询支付状态
        P-->>U: 处理中
    end
    Note over U,P: 最多轮询 12 次
    P-->>U: 支付成功`,
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
 * 校验 Mermaid 时序图代码（错误信息走 i18n，中英双语）：
 * - 空代码 → 提示输入
 * - 首行指令不是 sequenceDiagram → 提示期望的指令
 * 更深层的语法校验交给 mermaid.render，失败时 UI 统一展示双语错误。
 */
export function validateDiagram(code: string, t: Translate): void {
  const firstLine = firstNonEmptyLine(code)
  if (firstLine === '') {
    throw new Error(t('sequence.error.emptyCode'))
  }
  if (firstLine !== MERMAID_DIRECTIVE) {
    throw new Error(
      t('mermaid.error.wrongDirective', { expected: MERMAID_DIRECTIVE, actual: firstLine }),
    )
  }
}
