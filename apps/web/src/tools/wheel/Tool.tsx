import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { hashSeed, mulberry32, spin, transform } from './utils'
import type { WheelOutcome } from './utils'
import type { WheelInput, WheelOptions } from './schema'

/** 示例：6 个选项的转盘，抽 1 位获奖者 */
const EXAMPLE: WheelInput = { text: '苹果\n香蕉\n橙子\n葡萄\n西瓜\n芒果', winners: '1' }

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'
/** 转盘扇区配色（循环使用） */
const WHEEL_COLORS = [
  '#f87171',
  '#fb923c',
  '#facc15',
  '#4ade80',
  '#38bdf8',
  '#818cf8',
  '#e879f9',
  '#f472b6',
]
/** 转盘直径（px） */
const WHEEL_SIZE = 260
/** 旋转动画时长与缓动：纯 CSS transition，不引入动画库 */
const SPIN_TRANSITION = 'transform 4.2s cubic-bezier(0.12, 0.8, 0.24, 1)'

export default function Tool() {
  const t = useTranslate()
  // 每次挂载换一个盐：相同参数下「显示 / 复制 / 下载」结果一致
  const [salt] = useState(() => Math.floor(Math.random() * 0x7fffffff))
  // 旋转序号：点「开始转盘」即 +1，触发新的随机结果与 CSS 旋转动画
  const [nonce, setNonce] = useState(0)

  /** 确定性随机源工厂：相同 (salt, nonce, 输入) 产出相同序列 */
  function makeRand(input: WheelInput) {
    return mulberry32(hashSeed([salt, nonce, input.text, input.winners].join('|')))
  }

  function renderResult(input: WheelInput, options: WheelOptions) {
    try {
      const outcome = spin(input, options, makeRand(input))
      if (!outcome) return <p className="text-sm text-slate-500">{t('tool.empty')}</p>
      return (
        <WheelView
          inputText={input.text}
          outcome={outcome}
          spinning={nonce}
          onSpin={() => setNonce((n) => n + 1)}
        />
      )
    } catch (error) {
      return (
        <p role="alert" className={ERROR_CLASS}>
          {error instanceof Error ? error.message : String(error)}
        </p>
      )
    }
  }

  return (
    <MultiPanel<WheelInput, WheelOptions>
      meta={meta}
      initialInput={{ text: '', winners: '' }}
      initialOptions={{}}
      example={EXAMPLE}
      extraInputs={[{ key: 'winners', label: t('wheel.extra.winners'), rows: 1 }]}
      renderOutput={renderResult}
      toText={(input, options) => transform(input, options, makeRand(input), t)}
      downloadExt="txt"
    />
  )
}

interface WheelViewProps {
  readonly inputText: string
  readonly outcome: WheelOutcome
  readonly spinning: number
  readonly onSpin: () => void
}

/** 转盘视图：扇区 conic-gradient + 顶部指针 + CSS transition 旋转，无动画库 */
function WheelView({ inputText, outcome, spinning, onSpin }: WheelViewProps) {
  const t = useTranslate()
  const labels = inputText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
  const seg = outcome.spin.segmentAngle
  const gradient = `conic-gradient(${labels
    .map((_, i) => `${WHEEL_COLORS[i % WHEEL_COLORS.length]} ${i * seg}deg ${(i + 1) * seg}deg`)
    .join(', ')})`

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        data-testid="spin"
        className="mb-4 rounded bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        onClick={onSpin}
      >
        {t('wheel.spin')}
      </button>
      <div className="relative" style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}>
        <div
          data-testid="wheel-disc"
          data-round={spinning}
          className="h-full w-full rounded-full border-4 border-slate-300 shadow-lg dark:border-slate-700"
          style={{
            background: gradient,
            transform: `rotate(${outcome.spin.finalRotation}deg)`,
            // 首次渲染不做动画（避免挂载即转），之后每次旋转序号变化都带缓动
            transition: spinning === 0 ? 'none' : SPIN_TRANSITION,
          }}
        />
        {/* 顶部指针 */}
        <div
          aria-hidden
          className="absolute -top-1 left-1/2 z-10 -translate-x-1/2"
          style={{
            width: 0,
            height: 0,
            borderLeft: '12px solid transparent',
            borderRight: '12px solid transparent',
            borderTop: '20px solid #1e293b',
          }}
        />
        {/* 中心轴 */}
        <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-800 dark:bg-slate-200" />
      </div>
      {outcome.spin.winners.length > 0 ? (
        <div className="mt-4 w-full">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('wheel.result')}
          </p>
          <ol className="mt-2 space-y-1.5">
            {outcome.spin.winners.map((name, index) => (
              <li
                key={index}
                className="flex items-center gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
              >
                <span
                  aria-hidden
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{
                    background:
                      WHEEL_COLORS[outcome.spin.winnerIndexes[index] % WHEEL_COLORS.length],
                  }}
                />
                {name}
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{t('wheel.idle')}</p>
      )}
      <div className="mt-3 flex w-full flex-wrap gap-x-4 gap-y-1">
        {labels.map((label, i) => (
          <span
            key={i}
            className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400"
          >
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: WHEEL_COLORS[i % WHEEL_COLORS.length] }}
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
