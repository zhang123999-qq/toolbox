import { useEffect, useMemo, useRef } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import type { Translate } from '../../i18n'
import { meta } from './meta'
import { buildChartOption, describe, fmtFixed, parseSeries, summarizeText } from './utils'
import type { DataSeries, Summary } from './utils'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components'
import { SVGRenderer } from 'echarts/renderers'
import type { StatisticsInput, StatisticsOptions } from './schema'

/** 示例：带标签的月度数据 */
const EXAMPLE: StatisticsInput = { text: '一月,120\n二月,200\n三月,150\n四月,80\n五月,170' }

// 按需注册，避免把整包 echarts 都打进来
echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  SVGRenderer,
])

/** 用 SVG 渲染器画图：不依赖 canvas，测试环境也能挂上；卸载时 dispose */
function StatsChart({
  series,
  chart,
  t,
}: {
  series: DataSeries
  chart: StatisticsOptions['chart']
  t: Translate
}) {
  const ref = useRef<HTMLDivElement>(null)
  const option = useMemo(() => buildChartOption(series, chart, t), [series, chart, t])

  useEffect(() => {
    if (!ref.current) return
    // jsdom 里拿不到布局尺寸，显式给宽高
    const chartInstance = echarts.init(ref.current, undefined, {
      renderer: 'svg',
      width: 480,
      height: 280,
    })
    chartInstance.setOption(option)
    return () => chartInstance.dispose()
  }, [option])

  return <div ref={ref} data-testid="chart" />
}

/** 结果行：标签 + 等宽数字 */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-slate-100 py-1.5 last:border-0 dark:border-slate-800">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-mono text-sm tabular-nums text-slate-900 dark:text-slate-100">
        {value}
      </span>
    </div>
  )
}

/** 输出区：图表 + 汇总；同步 try/catch，错误进 role="alert" 错误态 */
function Output({ input, options }: { input: StatisticsInput; options: StatisticsOptions }) {
  const t = useTranslate()
  if (input.text.trim() === '') {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{t('tool.empty')}</p>
  }
  let series: DataSeries | null = null
  let error = ''
  try {
    series = parseSeries(input.text, t)
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
  }
  if (error !== '' || series === null) {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        {error}
      </p>
    )
  }
  const decimals = Number(options.decimals ?? '2')
  const summary: Summary = describe(series.values, t)
  const f = (n: number): string => fmtFixed(n, decimals)
  return (
    <div>
      <StatsChart series={series} chart={options.chart ?? 'bar'} t={t} />
      <div className="mt-2">
        <Row label={t('statistics.summary.count')} value={String(summary.count)} />
        <Row label={t('statistics.summary.sum')} value={f(summary.sum)} />
        <Row label={t('statistics.summary.mean')} value={f(summary.mean)} />
        <Row label={t('statistics.summary.min')} value={f(summary.min)} />
        <Row label={t('statistics.summary.max')} value={f(summary.max)} />
      </div>
    </div>
  )
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<StatisticsOptions>[] = [
    {
      key: 'chart',
      label: t('statistics.option.chart'),
      kind: 'select',
      values: ['bar', 'line', 'pie'],
    },
    {
      key: 'decimals',
      label: t('statistics.option.decimals'),
      kind: 'select',
      values: ['0', '1', '2', '4', '6', '8'],
    },
  ]

  return (
    <MultiPanel<StatisticsInput, StatisticsOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ chart: 'bar', decimals: '2' }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      renderOutput={(input, options) => <Output input={input} options={options} />}
      toText={(input, options) => {
        // 错误态下复制 / 下载无内容（与 TwoColumn 的 output 为空即不复制一致）
        try {
          return summarizeText(input, options, t)
        } catch {
          return ''
        }
      }}
      downloadExt="txt"
    />
  )
}
