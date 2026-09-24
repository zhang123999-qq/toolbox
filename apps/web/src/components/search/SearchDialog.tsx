import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchTools } from '@toolbox/search'
import { getTool, groupOfCategory } from '@toolbox/catalog'
import { groupName, toolTitle } from '../../i18n/catalog-text'
import { useI18n } from '../../i18n'
import { SearchIcon } from '../ui/icons'
import { CONTROL_BASE } from '../layout/controls'

/**
 * L2 全局搜索（Cmd+K / Ctrl+K）
 * L1（首页 Hero）与 L3（工具内搜索）见 HomePage 与工具页，阶段 0 先行实现 L2。
 *
 * 入口按钮沿用语 nav 偏好控件的同高同边框外观；窄屏只留图标，
 * 把宽度让给主题与语言控件。
 */
export function SearchDialog() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { locale, t } = useI18n()

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
        aria-label={t('search.open')}
        className={`${CONTROL_BASE} gap-1 px-2 text-sm`}
      >
        <SearchIcon className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">{t('search.open')}</span>
        <kbd className="ml-0.5 hidden rounded bg-slate-100 px-1 text-xs md:inline dark:bg-slate-800">
          ⌘K
        </kbd>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('search.dialogLabel')}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-24"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-xl dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <input
              ref={inputRef}
              data-testid="search-input"
              className="w-full border-b border-slate-200 bg-transparent px-4 py-3 text-sm outline-none dark:border-slate-700"
              placeholder={t('search.placeholder')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onResultKeyDown}
            />
            <ul className="max-h-80 overflow-auto py-1">
              {results.length === 0 ? (
                <li className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                  {query ? t('search.empty') : t('search.hint')}
                </li>
              ) : (
                results.map((doc, index) => {
                  // 索引由构建期从中文 meta 生成，展示时按当前语言取词
                  const tool = getTool(doc.slug)
                  return (
                    <li key={doc.id}>
                      <button
                        type="button"
                        onClick={() => go(doc.slug)}
                        className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 ${
                          index === active ? 'bg-slate-100 dark:bg-slate-800' : ''
                        }`}
                      >
                        <span>{tool ? toolTitle(locale, tool) : doc.title}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {groupName(t, groupOfCategory(doc.category))}
                        </span>
                      </button>
                    </li>
                  )
                })
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  )
}
