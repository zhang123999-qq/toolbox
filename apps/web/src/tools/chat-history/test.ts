import { describe, expect, it } from 'vitest'
import {
  MAX_MESSAGE_CHARS,
  MAX_TITLE_CHARS,
  countByModel,
  createSession,
  createSessionId,
  exportSessions,
  filterByModel,
  parseImportJson,
  parseMessageLines,
  searchSessions,
  sortSessions,
  summarizeSession,
  validateMessage,
} from './utils'
import type { ChatMessage, ChatSession } from './utils'

const msgs: ChatMessage[] = [
  { role: 'user', content: '你好' },
  { role: 'assistant', content: '你好呀' },
]

function makeSession(over: Partial<ChatSession> = {}): ChatSession {
  return {
    id: 's1',
    title: '测试',
    model: 'gpt-4o',
    createdAt: 1000,
    messages: msgs,
    ...over,
  }
}

describe('chat-history · utils', () => {
  it('createSessionId 可注入确定性', () => {
    expect(createSessionId(1000, 0.5)).toBe(createSessionId(1000, 0.5))
    expect(createSessionId(1000, 0.5)).not.toBe(createSessionId(1001, 0.5))
  })

  it('createSessionId 非法参数抛中文错', () => {
    expect(() => createSessionId(NaN)).toThrow('时间戳非法')
    expect(() => createSessionId(-1)).toThrow('时间戳非法')
    expect(() => createSessionId(1000, 1)).toThrow('随机数非法')
    expect(() => createSessionId(1000, -0.1)).toThrow('随机数非法')
  })

  it('createSession 正常创建', () => {
    const s = createSession(' 标题 ', ' gpt-4o ', msgs, 1000, 0.1)
    expect(s.title).toBe('标题')
    expect(s.model).toBe('gpt-4o')
    expect(s.createdAt).toBe(1000)
    expect(s.id.startsWith('s')).toBe(true)
  })

  it('createSession 校验失败抛中文错', () => {
    expect(() => createSession('', 'm', msgs)).toThrow('标题不能为空')
    expect(() => createSession('x'.repeat(MAX_TITLE_CHARS + 1), 'm', msgs)).toThrow('标题过长')
    expect(() => createSession('t', '  ', msgs)).toThrow('模型名不能为空')
    expect(() => createSession('t', 'm', [])).toThrow('消息列表不能为空')
    expect(() => createSession('t', 'm', [{ role: 'user', content: '' }])).toThrow(
      '消息内容不能为空',
    )
  })

  it('validateMessage 角色非法抛中文错', () => {
    expect(() => validateMessage({ role: 'bot', content: 'x' } as unknown as ChatMessage)).toThrow(
      '角色非法',
    )
    expect(() => validateMessage(null as unknown as ChatMessage)).toThrow('角色非法')
  })

  it('validateMessage 内容超长抛中文错', () => {
    expect(() =>
      validateMessage({ role: 'user', content: 'x'.repeat(MAX_MESSAGE_CHARS + 1) }),
    ).toThrow('消息内容过长')
  })

  it('parseMessageLines 正常解析（含中文冒号与空行）', () => {
    const out = parseMessageLines('user: 你好\n\nassistant：你好呀\nsystem: sys')
    expect(out).toEqual([
      { role: 'user', content: '你好' },
      { role: 'assistant', content: '你好呀' },
      { role: 'system', content: 'sys' },
    ])
  })

  it('parseMessageLines 格式错误指出行号', () => {
    expect(() => parseMessageLines('user: ok\n乱七八糟')).toThrow('第 2 行格式错误')
  })

  it('parseMessageLines 全空抛中文错', () => {
    expect(() => parseMessageLines('\n  \n')).toThrow('消息列表不能为空')
  })

  it('parseImportJson 数组格式', () => {
    const { sessions, skipped } = parseImportJson(
      JSON.stringify([{ title: 't', model: 'm', createdAt: 5, messages: msgs }]),
    )
    expect(sessions).toHaveLength(1)
    expect(skipped).toBe(0)
    expect(sessions[0]!.createdAt).toBe(5)
  })

  it('parseImportJson {sessions} 包裹格式', () => {
    const { sessions } = parseImportJson(JSON.stringify({ sessions: [] }))
    expect(sessions).toHaveLength(0)
  })

  it('parseImportJson 跳过非法条目并计数', () => {
    const { sessions, skipped } = parseImportJson(
      JSON.stringify([
        { title: 'ok', model: 'm', messages: msgs },
        { title: 'bad' },
        'nope',
        { title: 't', model: 'm', messages: [{ role: 'weird', content: 'x' }] },
        { title: 't', model: 'm', messages: [{ role: 'user', content: 1 }] },
        { title: 't', model: 'm', messages: [] },
        { title: 1, model: 'm', messages: msgs },
        { title: 't', model: 'm', messages: ['x'] },
      ]),
    )
    expect(sessions).toHaveLength(1)
    expect(skipped).toBe(7)
  })

  it('parseImportJson 缺 id/createdAt 时自动补全', () => {
    const { sessions } = parseImportJson(
      JSON.stringify([{ title: 't', model: 'm', messages: msgs, createdAt: 'x' }]),
    )
    expect(sessions[0]!.id).not.toBe('')
    expect(Number.isFinite(sessions[0]!.createdAt)).toBe(true)
  })

  it('parseImportJson 非法 JSON / 顶层结构抛中文错', () => {
    expect(() => parseImportJson('{oops')).toThrow('JSON 解析失败')
    expect(() => parseImportJson('{"a":1}')).toThrow('顶层应为会话数组')
    expect(() => parseImportJson('"str"')).toThrow('顶层应为会话数组')
  })

  it('parseImportJson 超量抛中文错', () => {
    const big = JSON.stringify(new Array(1001).fill({ title: 't', model: 'm', messages: msgs }))
    expect(() => parseImportJson(big)).toThrow('导入会话过多')
  })

  it('searchSessions 大小写不敏感多字段', () => {
    const list = [
      makeSession({ id: 'a', title: '复利计算', model: 'gpt-4o', messages: msgs }),
      makeSession({
        id: 'b',
        title: '旅游',
        model: 'claude',
        messages: [{ role: 'user', content: 'Hello World' }],
      }),
    ]
    expect(searchSessions(list, '')).toHaveLength(2)
    expect(searchSessions(list, '复利')).toHaveLength(1)
    expect(searchSessions(list, 'CLAUDE')).toHaveLength(1)
    expect(searchSessions(list, 'hello')).toHaveLength(1)
    expect(searchSessions(list, '不存在')).toHaveLength(0)
  })

  it('filterByModel', () => {
    const list = [makeSession({ id: 'a', model: 'gpt-4o' }), makeSession({ id: 'b', model: 'x' })]
    expect(filterByModel(list, 'all')).toHaveLength(2)
    expect(filterByModel(list, '')).toHaveLength(2)
    expect(filterByModel(list, 'gpt-4o')).toHaveLength(1)
  })

  it('sortSessions 不修改输入', () => {
    const list = [makeSession({ id: 'a', createdAt: 2 }), makeSession({ id: 'b', createdAt: 1 })]
    expect(sortSessions(list, 'newest').map((s) => s.id)).toEqual(['a', 'b'])
    expect(sortSessions(list, 'oldest').map((s) => s.id)).toEqual(['b', 'a'])
    expect(list[0]!.id).toBe('a')
  })

  it('exportSessions 往返一致', () => {
    const list = [makeSession()]
    const { sessions } = parseImportJson(exportSessions(list))
    expect(sessions).toHaveLength(1)
    expect(sessions[0]!.title).toBe('测试')
  })

  it('summarizeSession 截断预览', () => {
    const long = 'x'.repeat(100)
    expect(
      summarizeSession(makeSession({ messages: [{ role: 'user', content: long }] })).preview,
    ).toBe(`${'x'.repeat(60)}…`)
    expect(summarizeSession(makeSession({ messages: [] })).preview).toBe('')
    expect(summarizeSession(makeSession()).messageCount).toBe(2)
  })

  it('countByModel 按数量倒序', () => {
    const list = [
      makeSession({ id: 'a', model: 'x' }),
      makeSession({ id: 'b', model: 'y' }),
      makeSession({ id: 'c', model: 'x' }),
    ]
    expect(countByModel(list)).toEqual([
      { model: 'x', count: 2 },
      { model: 'y', count: 1 },
    ])
    expect(countByModel([])).toEqual([])
  })
})
