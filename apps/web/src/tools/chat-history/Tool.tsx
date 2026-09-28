import { useEffect, useMemo, useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import type { ChatHistoryFormOptions, ChatHistoryInput } from './schema'
import {
  countByModel,
  createSession,
  exportSessions,
  filterByModel,
  parseImportJson,
  parseMessageLines,
  searchSessions,
  sortSessions,
  summarizeSession,
} from './utils'
import type { ChatSession } from './utils'

/** localStorage 键 */
const LS_KEY = 'toolbox:chat-history:sessions'

/** localStorage 读写只允许出现在这里，utils 保持纯函数 */
function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const { sessions } = parseImportJson(raw)
    return [...sessions]
  } catch {
    return []
  }
}

function saveSessions(sessions: readonly ChatSession[]): void {
  try {
    localStorage.setItem(LS_KEY, exportSessions(sessions))
  } catch {
    /* 忽略存储异常（如配额不足） */
  }
}

export default function Tool() {
  const [sessions, setSessions] = useState<ChatSession[]>(loadSessions)
  const [title, setTitle] = useState('')
  const [model, setModel] = useState('')
  const [lines, setLines] = useState('')
  const [importText, setImportText] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    saveSessions(sessions)
  }, [sessions])

  const optionDefs: readonly OptionDef<ChatHistoryFormOptions>[] = [
    { key: 'modelFilter', label: '模型筛选', kind: 'text', placeholder: 'all' },
    { key: 'sortOrder', label: '排序', kind: 'select', values: ['newest', 'oldest'] },
  ]

  const modelStats = useMemo(() => countByModel(sessions), [sessions])

  function visibleSessions(input: ChatHistoryInput, opts: ChatHistoryFormOptions): ChatSession[] {
    return sortSessions(
      filterByModel(searchSessions(sessions, input.text), opts.modelFilter),
      opts.sortOrder,
    )
  }

  function handleAdd(): void {
    setError('')
    setNotice('')
    try {
      const s = createSession(title, model, parseMessageLines(lines))
      setSessions((prev) => [s, ...prev])
      setTitle('')
      setModel('')
      setLines('')
      setNotice('已添加 1 条对话')
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加失败')
    }
  }

  function handleImport(): void {
    setError('')
    setNotice('')
    try {
      const { sessions: imported, skipped } = parseImportJson(importText)
      if (imported.length === 0 && skipped === 0) throw new Error('没有可导入的会话')
      setSessions((prev) => {
        const ids = new Set(prev.map((s) => s.id))
        const fresh = imported.filter((s) => !ids.has(s.id))
        return [...fresh, ...prev]
      })
      setImportText('')
      setNotice(
        skipped > 0
          ? `导入 ${imported.length} 条，跳过 ${skipped} 条非法记录`
          : `导入 ${imported.length} 条对话`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败')
    }
  }

  function handleExport(): void {
    setError('')
    const blob = new Blob([exportSessions(sessions)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'chat-history.json'
    a.click()
    URL.revokeObjectURL(url)
    setNotice(`已导出 ${sessions.length} 条对话`)
  }

  function handleClear(): void {
    if (sessions.length === 0) return
    if (!window.confirm('确定清空全部本地对话记录吗？此操作不可恢复。')) return
    setSessions([])
    setNotice('已清空全部对话')
  }

  function handleDelete(id: string): void {
    setSessions((prev) => prev.filter((s) => s.id !== id))
  }

  return (
    <MultiPanel<ChatHistoryInput, ChatHistoryFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ modelFilter: 'all', sortOrder: 'newest' }}
      optionDefs={optionDefs}
      example={{ text: '' }}
      renderOutput={(input, options) => {
        const list = visibleSessions(input, options)
        return (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              共 {sessions.length} 条本地记录
              {modelStats.length > 0
                ? `（${modelStats.map((m) => `${m.model}×${m.count}`).join('、')}）`
                : ''}
              ；左侧输入框可按标题 / 模型 / 内容搜索，全部数据只存浏览器本地，不联网。
            </p>
            <div className="flex flex-col gap-2 rounded border border-slate-200 p-2 dark:border-slate-700">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">手动添加对话</p>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  data-testid="session-title"
                  placeholder="标题"
                  className="w-48 rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <input
                  type="text"
                  data-testid="session-model"
                  placeholder="模型名"
                  className="w-48 rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </div>
              <textarea
                data-testid="session-messages"
                rows={4}
                placeholder={'每行一条，格式如：\nuser: 你好\nassistant: 你好！有什么可以帮你？'}
                className="w-full resize-y rounded border border-slate-300 p-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                value={lines}
                onChange={(e) => setLines(e.target.value)}
              />
              <div>
                <button
                  type="button"
                  data-testid="add-session"
                  className={SECONDARY_BUTTON}
                  onClick={handleAdd}
                >
                  添加对话
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2 rounded border border-slate-200 p-2 dark:border-slate-700">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">导入 JSON</p>
              <textarea
                data-testid="import-text"
                rows={3}
                placeholder='粘贴 [{"title":"...","model":"...","messages":[{"role":"user","content":"..."}]}]'
                className="w-full resize-y rounded border border-slate-300 p-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  data-testid="import-btn"
                  className={SECONDARY_BUTTON}
                  onClick={handleImport}
                >
                  导入
                </button>
                <button
                  type="button"
                  data-testid="export-btn"
                  className={SECONDARY_BUTTON}
                  disabled={sessions.length === 0}
                  onClick={handleExport}
                >
                  导出 JSON
                </button>
                <button
                  type="button"
                  data-testid="clear-all"
                  className={SECONDARY_BUTTON}
                  disabled={sessions.length === 0}
                  onClick={handleClear}
                >
                  清空全部
                </button>
              </div>
            </div>
            {error ? (
              <div
                role="alert"
                data-testid="error"
                className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
              >
                {error}
              </div>
            ) : null}
            {notice ? (
              <p data-testid="notice" className="text-sm text-emerald-600 dark:text-emerald-400">
                {notice}
              </p>
            ) : null}
            <div className="flex flex-col gap-2">
              {list.map((s) => {
                const sum = summarizeSession(s)
                return (
                  <div
                    key={s.id}
                    data-testid="session-item"
                    className="flex items-start justify-between gap-2 rounded border border-slate-200 p-2 dark:border-slate-700"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                        {s.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {s.model} · {new Date(s.createdAt).toLocaleString()} · {sum.messageCount}{' '}
                        条消息
                      </p>
                      <p className="truncate text-xs text-slate-500">{sum.preview}</p>
                    </div>
                    <button
                      type="button"
                      data-testid={`delete-${s.id}`}
                      className={SECONDARY_BUTTON}
                      onClick={() => handleDelete(s.id)}
                    >
                      删除
                    </button>
                  </div>
                )
              })}
              {list.length === 0 ? (
                <p className="text-sm text-slate-500">
                  {sessions.length === 0
                    ? '还没有对话记录，先手动添加或导入 JSON。'
                    : '没有匹配的对话。'}
                </p>
              ) : null}
            </div>
          </div>
        )
      }}
      toText={(input, options) =>
        visibleSessions(input, options)
          .map((s) => `[${s.model}] ${s.title}`)
          .join('\n')
      }
      downloadExt="txt"
    />
  )
}
