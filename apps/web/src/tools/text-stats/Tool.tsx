import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { statsText, chartData } from './utils'
import { useEffect, useMemo, useRef } from 'react'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { SVGRenderer } from 'echarts/renderers'
import type { TextStatsInput, TextStatsOptions } from './schema'

const EXAMPLE: TextStatsInput = { text: '苹果 香蕉 苹果 橘子 香蕉 苹果\n西瓜 橘子 苹果 香蕉' }

// 按需注册，避免把整包 echarts 都打进来
echarts.use([BarChart, GridComponent, TooltipComponent, SVGRenderer])

/** 用 SVG 渲染器画柱状图：不依赖 canvas，测试环境也能挂上 */
function StatsChart({ input, options }: { input: TextStatsInput; options: TextStatsOptions }) {
  const t = useTranslate()
  const ref = useRef<HTMLDivElement>(null)
  const data = useMemo(() => chartData(input.text, options), [input.text, options])

  useEffect(() => {
    if (!ref.current) return
    // jsdom 里拿不到布局尺寸，显式给宽高
    const chart = echarts.init(ref.current, undefined, { renderer: 'svg', width: 480, height: 260 })
    chart.setOption({
      grid: { left: 48, right: 12, top: 12, bottom: 56 },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: data.labels, axisLabel: { interval: 0, rotate: 30 } },
      yAxis: { type: 'value', minInterval: 1 },
      series: [{ type: 'bar', data: data.values, itemStyle: { color: '#3b82f6' } }],
    })
    return () => chart.dispose()
  }, [data])

  if (data.labels.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{t('tool.empty')}</p>
  }
  return <div ref={ref} data-testid="chart" />
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<TextStatsOptions>[] = [
    { key: 'metric', label: t('option.metric'), kind: 'select', values: ['freq', 'length'] },
    { key: 'limit', label: t('option.limit'), kind: 'select', values: [10, 20, 30] },
  ]

  return (
    <MultiPanel<TextStatsInput, TextStatsOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ metric: 'freq', limit: '10' }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      // 默认按「渲染 HTML 字符串」包裹；工具可用 renderJsx 给出自定义 JSX 表达式
      renderOutput={(input, options) => <StatsChart input={input} options={options} />}
      toText={(input, options) => statsText(input, options)}
      downloadExt="txt"
    />
  )
}
