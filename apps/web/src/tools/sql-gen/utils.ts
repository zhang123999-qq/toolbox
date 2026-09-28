/**
 * sql-gen —— SQL 生成的纯函数层
 *
 * 本文件不触碰任何浏览器 API（fetch 只在 Tool.tsx 中使用），
 * 可在 node 下被 vitest 完整测试。
 */

/** 默认接口地址（OpenAI 官方） */
export const DEFAULT_BASE_URL = 'https://api.openai.com/v1'

/** 单次请求超时（毫秒） */
export const REQUEST_TIMEOUT_MS = 60_000

/** 需求描述上限字符数 */
export const MAX_DESC_CHARS = 2000

/** 支持的 SQL 方言 */
export const DIALECTS = ['mysql', 'postgresql', 'sqlite', 'sqlserver', 'oracle'] as const
export type Dialect = (typeof DIALECTS)[number]
export const DEFAULT_DIALECT: Dialect = 'mysql'

/** 方言 → 中文显示名 */
export const DIALECT_LABELS: Record<Dialect, string> = {
  mysql: 'MySQL',
  postgresql: 'PostgreSQL',
  sqlite: 'SQLite',
  sqlserver: 'SQL Server',
  oracle: 'Oracle',
}

export function dialectLabel(dialect: Dialect): string {
  return DIALECT_LABELS[dialect]
}

/** BYOK 配置 */
export interface SqlGenConfig {
  readonly baseURL: string
  readonly model: string
  readonly apiKey: string
}

/** 拼出 chat/completions 地址 */
export function chatCompletionsUrl(baseURL: string): string {
  if (typeof baseURL !== 'string' || baseURL.trim() === '') {
    throw new Error('接口地址不能为空')
  }
  return `${baseURL.trim().replace(/\/+$/, '')}/chat/completions`
}

/** 校验需求描述非空且不超长 */
export function validateDescription(desc: string): string {
  const text = desc.trim()
  if (text === '') throw new Error('需求描述不能为空')
  if (text.length > MAX_DESC_CHARS) {
    throw new Error(`需求描述过长：${text.length} 字符，超过 ${MAX_DESC_CHARS} 上限`)
  }
  return text
}

/** 校验方言在候选列表内 */
export function validateDialect(dialect: string): Dialect {
  if ((DIALECTS as readonly string[]).includes(dialect)) return dialect as Dialect
  throw new Error(`不支持的方言：${dialect}`)
}

/** 构造请模型生成 SQL 的提示词：要求只返回 SQL 代码块 */
export function buildSqlPrompt(desc: string, dialect: Dialect): string {
  return [
    `请把下面的自然语言需求转换成 ${dialectLabel(dialect)} 方言的 SQL 语句。`,
    '要求：只输出 SQL 代码块（用 ```sql 包裹），不要输出任何解释文字；',
    '如果需求含糊，按最常见的理解生成一条可执行的语句。',
    '---',
    desc,
  ].join('\n')
}

/** OpenAI-compatible 请求体 */
export function buildRequestBody(
  model: string,
  desc: string,
  dialect: Dialect,
): {
  readonly model: string
  readonly messages: readonly { readonly role: string; readonly content: string }[]
  readonly temperature: number
} {
  return {
    model,
    messages: [{ role: 'user', content: buildSqlPrompt(desc, dialect) }],
    temperature: 0.2,
  }
}

interface ChatResponseLike {
  readonly choices?: readonly { readonly message?: { readonly content?: unknown } }[]
}

/** 从响应 JSON 取出助手文本；结构异常抛中文错 */
export function extractAssistantText(data: unknown): string {
  const choices = (data as ChatResponseLike | null | undefined)?.choices
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error('接口返回异常：缺少 choices 字段')
  }
  const content = choices[0]?.message?.content
  if (typeof content !== 'string' || content.trim() === '') {
    throw new Error('接口返回异常：助手的回复内容为空')
  }
  return content.trim()
}

/** HTTP 错误码 → 中文提示 */
export function parseHttpError(status: number, bodyText: string): string {
  const hint = bodyText.trim().slice(0, 200)
  const suffix = hint === '' ? '' : `（${hint}）`
  if (status === 401) return `认证失败：API Key 无效或已过期${suffix}`
  if (status === 403) return `无权限：该 Key 无权访问此模型或接口${suffix}`
  if (status === 404) return `接口不存在：请检查 baseURL 或模型名${suffix}`
  if (status === 429) return `请求过于频繁或配额不足，请稍后重试${suffix}`
  if (status >= 500) return `服务端错误（${status}），请稍后重试${suffix}`
  return `请求失败（HTTP ${status}）${suffix}`
}

/**
 * 从 LLM 返回中严格提取 SQL 代码块：
 * 优先 ```sql 块，其次任意 ``` 块；都没有则抛中文错。
 */
export function extractSqlCodeBlock(text: string): string {
  const sqlFenced = /```sql\s*\n([\s\S]*?)```/i.exec(text)
  if (sqlFenced) return sqlFenced[1].trim()
  const anyFenced = /```\w*\s*\n?([\s\S]*?)```/.exec(text)
  if (anyFenced) {
    const code = anyFenced[1].trim()
    if (code !== '') return code
  }
  throw new Error('接口返回异常：未找到 SQL 代码块')
}

/** 生成可复制 / 下载的 SQL 报告 */
export function buildReport(
  desc: string,
  dialect: Dialect,
  model: string,
  sql: string,
): string {
  return [
    '## SQL 生成',
    '',
    `需求：${desc}`,
    `方言：${dialectLabel(dialect)}`,
    `模型：${model}`,
    '',
    '```sql',
    sql,
    '```',
  ].join('\n')
}
