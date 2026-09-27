import type { Translate } from '../../i18n'
import { inputSchema } from './schema'

/** Mermaid 源码长度上限（字符）：超出后截断并在 UI 提示，避免超大代码拖慢渲染 */
export const MAX_CODE_LENGTH = 20_000

/** 本工具只渲染 UML 类图：首个非空行必须精确等于该指令 */
export const MERMAID_DIRECTIVE = 'classDiagram'

/** 内置示例（3 个）：「示例」按钮填入第 1 个，全部示例见 README */
export const EXAMPLES: readonly string[] = [
  `classDiagram
    class Animal {
        +String name
        +int age
        +eat() void
    }
    class Dog {
        +bark() void
    }
    Animal <|-- Dog`,
  `classDiagram
    class Order {
        -String id
        -Money total
        +place() void
        +cancel() void
    }
    class Customer {
        -String name
        +placeOrder() Order
    }
    class Money {
        -long cents
        -String currency
    }
    Customer "1" --> "*" Order : places
    Order *-- Money : total
    class Payment {
        <<interface>>
        +pay(Money amount) bool
    }
    class Alipay {
        +pay(Money amount) bool
    }
    Payment <|.. Alipay`,
  `classDiagram
    class Shape {
        <<abstract>>
        -String color
        +area() double*
    }
    class Circle {
        -double radius
        +area() double
    }
    class Rectangle {
        -double width
        -double height
        +area() double
    }
    Shape <|-- Circle
    Shape <|-- Rectangle
    note for Shape "所有图形的基类"`,
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
 * 校验 Mermaid UML 类图代码（错误信息走 i18n，中英双语）：
 * - 空代码 → 提示输入
 * - 首行指令不是 classDiagram → 提示期望的指令
 * 更深层的语法校验交给 mermaid.render，失败时 UI 统一展示双语错误。
 */
export function validateDiagram(code: string, t: Translate): void {
  const firstLine = firstNonEmptyLine(code)
  if (firstLine === '') {
    throw new Error(t('uml.error.emptyCode'))
  }
  if (firstLine !== MERMAID_DIRECTIVE) {
    throw new Error(
      t('mermaid.error.wrongDirective', { expected: MERMAID_DIRECTIVE, actual: firstLine }),
    )
  }
}
