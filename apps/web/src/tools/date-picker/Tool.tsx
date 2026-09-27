import { useState } from 'react'
import type { DatePickerInput, DatePickerOptions } from './schema'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import { buildCalendar, isToday, selectedInfo } from './utils'

const WEEK_HEADER = ['一', '二', '三', '四', '五', '六', '日']

/** 日历主体：月份切换 / 今天高亮 / 选中日期 */
function DatePickerPanel() {
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1)
  const [selected, setSelected] = useState<Date | null>(null)

  function prevMonth() {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1)
      setViewMonth(12)
    } else {
      setViewMonth((m) => m - 1)
    }
  }
  function nextMonth() {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1)
      setViewMonth(1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  const weeks = buildCalendar(viewYear, viewMonth)

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          data-testid="dp-prev"
          className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700 dark:text-slate-200"
          onClick={prevMonth}
        >
          上一月
        </button>
        <div data-testid="dp-title" className="min-w-28 text-center font-semibold">
          {viewYear} 年 {String(viewMonth).padStart(2, '0')} 月
        </div>
        <button
          type="button"
          data-testid="dp-next"
          className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700 dark:text-slate-200"
          onClick={nextMonth}
        >
          下一月
        </button>
      </div>

      <div data-testid="dp-grid" className="w-full max-w-xs">
        <div className="grid grid-cols-7 text-center text-xs text-slate-400">
          {WEEK_HEADER.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 text-center text-sm">
            {week.map((day, di) => {
              if (day === null) return <div key={di} className="py-1.5" />
              const today = isToday(viewYear, viewMonth, day)
              const sel =
                selected !== null &&
                selected.getFullYear() === viewYear &&
                selected.getMonth() + 1 === viewMonth &&
                selected.getDate() === day
              return (
                <button
                  key={di}
                  type="button"
                  data-testid={'dp-day-' + day}
                  onClick={() => setSelected(new Date(viewYear, viewMonth - 1, day))}
                  className={
                    'mx-auto flex h-8 w-8 items-center justify-center rounded-full tabular-nums ' +
                    (sel
                      ? 'bg-brand text-white'
                      : today
                        ? 'border border-brand text-brand'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800')
                  }
                >
                  {day}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <div data-testid="dp-info" className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        {selected ? selectedInfo(selected) : '点选上方日历中的某一天'}
      </div>
    </div>
  )
}

export default function Tool() {
  return (
    <MultiPanel<DatePickerInput, DatePickerOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={{ text: '' }}
      renderOutput={() => <DatePickerPanel />}
      toText={(input) => {
        // 纯函数无法拿到实时选中态；输入框不参与，固定返回空串
        void input
        return ''
      }}
      downloadExt="txt"
    />
  )
}
