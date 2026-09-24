import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

  // 打开/关闭时复位查询与高亮项。
  // 刻意不写进 effect（react-hooks/set-state-in-effect）：那是「渲染后再同步状态」，
  // 会多一次渲染，且状态的来源被拆到两处。这里由用户动作直接驱动，来源单一。
  const openDialog = useCallback(() => {
    setQuery('')
    setActive(0)
    setOpen(true)
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setActive(0)
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        if (open) close()
        else openDialog()
        return
      }
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, close, openDialog])

  // 打开后聚焦输入框：纯 DOM 副作用，不触发状态更新
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  function go(slug: string) {
    close()
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
        onClick={openDialog}
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
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-24"
        >
          {/*
            背板用真正的 <button>，而不是「给 div 挂 onClick」：
            前者键盘天然可达（Esc 之外的第二条关闭路径），后者会同时踩中
            click-events-have-key-events / no-noninteractive-element-interactions
            两条规则——而那两条规则指出的确实是可访问性缺陷，不是误报。
            用 fixed 而非 absolute：absolute 的包含块是父元素的 padding box，
            会在 p-4 留出的边缘上留下点不到的死区。
            tabIndex=-1：关闭是附加路径，不让它抢走打开时本该落在输入框的焦点。
          */}
          <button
            type="button"
            aria-label={t('search.close')}
            tabIndex={-1}
            onClick={close}
            className="fixed inset-0 h-full w-full cursor-default bg-black/40"
          />
          <div className="relative w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-xl dark:bg-slate-900">
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
