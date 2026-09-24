import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchTools } from '@toolbox/search'
import { getGroup, groupOfCategory } from '@toolbox/catalog'

/**
 * L2 全局搜索（Cmd+K / Ctrl+K）
 * L1（首页 Hero）与 L3（工具内搜索）见 HomePage 与工具页，阶段 0 先行实现 L2。
 */
export function SearchDialog() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const results = useMemo(() => searchTools(query), [query])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((prev) => !prev)
      }
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (open) inputRef.current?.focus()
    else setQuery('')
    setActive(0)
  }, [open])

  function go(slug: string) {
    setOpen(false)
    navigate(`/tools/${slug}`)
  }

  function onResultKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!results.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((i) => (i + 1) % results.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => (i - 1 + results.length) % results.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const target = results[active]
      if (target) go(target.slug)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
      >
        搜索 <kbd className="ml-1 rounded bg-slate-100 px-1 text-xs">⌘K</kbd>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="搜索工具"
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-24"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <input
              ref={inputRef}
              data-testid="search-input"
              className="w-full border-b border-slate-200 px-4 py-3 text-sm outline-none"
              placeholder="搜索工具（支持标题、标签、描述）"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onResultKeyDown}
            />
            <ul className="max-h-80 overflow-auto py-1">
              {results.length === 0 ? (
                <li className="px-4 py-3 text-sm text-slate-500">
                  {query ? '无匹配结果' : '输入关键词开始搜索'}
                </li>
              ) : (
                results.map((doc, index) => (
                  <li key={doc.id}>
                    <button
                      type="button"
                      onClick={() => go(doc.slug)}
                      className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-slate-50 ${
                        index === active ? 'bg-slate-100' : ''
                      }`}
                    >
                      <span>{doc.title}</span>
                      <span className="text-xs text-slate-500">
                        {getGroup(groupOfCategory(doc.category)).name}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  )
}
