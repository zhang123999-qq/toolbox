/**
 * chat-history —— 对话历史管理的纯函数层
 *
 * 约定：本文件不触碰 localStorage（读写只在 Tool.tsx 中），
 * 可在 node 下被 vitest 完整测试。
 */

/** 单条消息 */
export interface ChatMessage {
  readonly role: 'user' | 'assistant' | 'system'
  readonly content: string
}

/** 一次对话会话 */
export interface ChatSession {
  readonly id: string
  readonly title: string
  readonly model: string
  readonly createdAt: number
  readonly messages: readonly ChatMessage[]
}

/** 会话标题上限 */
export const MAX_TITLE_CHARS = 100
/** 单条消息内容上限 */
export const MAX_MESSAGE_CHARS = 50_000
/** 单次导入上限会话数 */
export const MAX_IMPORT_SESSIONS = 1_000

/** 生成会话 id：纯函数，时间戳与随机源可注入以便测试确定性 */
export function createSessionId(now: number = Date.now(), rand: number = Math.random()): string {
  if (!Number.isFinite(now) || now < 0) throw new Error('时间戳非法')
  if (!(rand >= 0 && rand < 1)) throw new Error('随机数非法')
  return `s${Math.floor(now).toString(36)}${Math.floor(rand * 0xffffffff)
    .toString(36)
    .padStart(7, '0')}`
}

/** 新建会话：校验标题 / 模型名 / 消息 */
export function createSession(
  title: string,
  model: string,
  messages: readonly ChatMessage[],
  now: number = Date.now(),
  rand: number = Math.random(),
): ChatSession {
  const t = title.trim()
  if (t === '') throw new Error('标题不能为空')
  if (t.length > MAX_TITLE_CHARS) throw new Error(`标题过长：超过 ${MAX_TITLE_CHARS} 字符`)
  const m = model.trim()
  if (m === '') throw new Error('模型名不能为空')
  if (messages.length === 0) throw new Error('消息列表不能为空')
  for (const msg of messages) validateMessage(msg)
  return { id: createSessionId(now, rand), title: t, model: m, createdAt: now, messages }
}

/** 校验单条消息 */
export function validateMessage(msg: ChatMessage): void {
  if (!msg || (msg.role !== 'user' && msg.role !== 'assistant' && msg.role !== 'system')) {
    throw new Error('消息角色非法：应为 user / assistant / system')
  }
  if (typeof msg.content !== 'string' || msg.content.trim() === '') {
    throw new Error('消息内容不能为空')
  }
  if (msg.content.length > MAX_MESSAGE_CHARS) {
    throw new Error(`消息内容过长：超过 ${MAX_MESSAGE_CHARS} 字符`)
  }
}

/**
 * 解析手动添加的消息文本：每行 "user: 内容" / "assistant: 内容" / "system: 内容"。
 * 空行忽略；格式错误的行抛中文错并指出行号。
 */
export function parseMessageLines(text: string): ChatMessage[] {
  const out: ChatMessage[] = []
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim()
    if (line === '') continue
    const m = /^(user|assistant|system)\s*[:：]\s*([\s\S]*)$/.exec(line)
    if (!m)
      throw new Error(
        `第 ${i + 1} 行格式错误：应为 "user: 内容" / "assistant: 内容" / "system: 内容"`,
      )
    out.push({ role: m[1] as ChatMessage['role'], content: m[2]!.trim() })
  }
  if (out.length === 0) throw new Error('消息列表不能为空：请按每行 "角色: 内容" 填写')
  for (const msg of out) validateMessage(msg)
  return out
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

/** 校验导入的单个会话对象；非法返回 null（由调用方计入跳过） */
function coerceSession(raw: unknown): ChatSession | null {
  if (!isRecord(raw)) return null
  const { title, model, createdAt, messages } = raw
  if (typeof title !== 'string' || typeof model !== 'string') return null
  if (!Array.isArray(messages) || messages.length === 0) return null
  const clean: ChatMessage[] = []
  for (const m of messages) {
    if (!isRecord(m)) return null
    const { role, content } = m
    if (role !== 'user' && role !== 'assistant' && role !== 'system') return null
    if (typeof content !== 'string') return null
    clean.push({ role, content })
  }
  return {
    id: typeof raw.id === 'string' && raw.id !== '' ? raw.id : createSessionId(),
    title,
    model,
    createdAt: typeof createdAt === 'number' && Number.isFinite(createdAt) ? createdAt : Date.now(),
    messages: clean,
  }
}

export interface ImportResult {
  readonly sessions: readonly ChatSession[]
  readonly skipped: number
}

/**
 * 解析导入的 JSON：顶层应为数组（或 {sessions: 数组}）。
 * 非法条目跳过并计数；JSON 解析失败或顶层结构错误抛中文错。
 */
export function parseImportJson(jsonText: string): ImportResult {
  let data: unknown
  try {
    data = JSON.parse(jsonText) as unknown
  } catch {
    throw new Error('JSON 解析失败：请检查格式')
  }
  const arr = Array.isArray(data)
    ? data
    : isRecord(data) && Array.isArray(data.sessions)
      ? data.sessions
      : null
  if (!arr) throw new Error('导入格式错误：顶层应为会话数组或 {sessions: [...]}')
  if (arr.length > MAX_IMPORT_SESSIONS) {
    throw new Error(`导入会话过多：${arr.length} 个，超过 ${MAX_IMPORT_SESSIONS} 上限`)
  }
  const sessions: ChatSession[] = []
  let skipped = 0
  for (const raw of arr) {
    const s = coerceSession(raw)
    if (s) sessions.push(s)
    else skipped++
  }
  return { sessions, skipped }
}

/** 关键词搜索：标题 / 模型 / 消息内容（大小写不敏感）；空关键词返回全部 */
export function searchSessions(sessions: readonly ChatSession[], query: string): ChatSession[] {
  const q = query.trim().toLowerCase()
  if (q === '') return [...sessions]
  return sessions.filter(
    (s) =>
      s.title.toLowerCase().includes(q) ||
      s.model.toLowerCase().includes(q) ||
      s.messages.some((m) => m.content.toLowerCase().includes(q)),
  )
}

/** 按模型筛选：'all' 或空表示全部 */
export function filterByModel(sessions: readonly ChatSession[], model: string): ChatSession[] {
  const m = model.trim()
  if (m === '' || m === 'all') return [...sessions]
  return sessions.filter((s) => s.model === m)
}

/** 按时间排序：newest 在前 / oldest 在前（不修改输入） */
export function sortSessions(
  sessions: readonly ChatSession[],
  order: 'newest' | 'oldest',
): ChatSession[] {
  const copy = [...sessions]
  copy.sort((a, b) => (order === 'newest' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt))
  return copy
}

/** 导出为 JSON 字符串 */
export function exportSessions(sessions: readonly ChatSession[]): string {
  return JSON.stringify({ sessions }, null, 2)
}

/** 会话摘要：消息条数与首条消息预览 */
export function summarizeSession(session: ChatSession): { messageCount: number; preview: string } {
  const first = session.messages[0]?.content ?? ''
  const preview = first.length > 60 ? `${first.slice(0, 60)}…` : first
  return { messageCount: session.messages.length, preview }
}

/** 统计各模型的会话数（供筛选下拉框） */
export function countByModel(sessions: readonly ChatSession[]): { model: string; count: number }[] {
  const map = new Map<string, number>()
  for (const s of sessions) map.set(s.model, (map.get(s.model) ?? 0) + 1)
  return [...map.entries()]
    .map(([model, count]) => ({ model, count }))
    .sort((a, b) => b.count - a.count)
}
