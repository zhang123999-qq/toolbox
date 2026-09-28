import { useEffect, useMemo, useRef } from 'react'
import { z } from 'zod'
import * as echarts from 'echarts/core'
import { ScatterChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { SVGRenderer } from 'echarts/renderers'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { optionsSchema } from './schema'
import type { EmbeddingVisFormOptions, EmbeddingVisInput } from './schema'
import { EMBED_DIMS, buildScatterOption, embedText, parseLabeledLines, pcaProject } from './utils'
import type { Point2D } from './utils'

// 按需注册，避免把整包 echarts 都打进来
echarts.use([ScatterChart, GridComponent, TooltipComponent, SVGRenderer])

function toChineseError(err: unknown): string {
  if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
  return err instanceof Error ? err.message : '计算失败，请重试'
}

interface VisData {
  readonly points: Point2D[]
  readonly labels: string[]
}

/** 计算可视化数据：解析 → 向量 → PCA；失败返回中文错误 */
function computeVis(
  text: string,
  dimRaw: string,
): { ok: true; data: VisData } | { ok: false; message: string } {
  try {
    const { dim } = optionsSchema.parse({ dim: dimRaw })
    const items = parseLabeledLines(text)
    const vectors = items.map((it) => embedText(it.text, dim))
    const projected = pcaProject(vectors)
    const points = projected.map((p, i) => ({ ...p, label: items[i]!.label }))
    return { ok: true, data: { points, labels: items.map((it) => it.label) } }
  } catch (err) {
    return { ok: false, message: toChineseError(err) }
  }
}

/** SVG 渲染散点图：不依赖 canvas，测试环境也能挂上 */
function ScatterView({ points }: { points: readonly Point2D[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const option = useMemo(() => buildScatterOption(points), [points])

  useEffect(() => {
    if (!ref.current) return
    // jsdom 里拿不到布局尺寸，显式给宽高
    const chart = echarts.init(ref.current, undefined, { renderer: 'svg', width: 560, height: 380 })
    chart.setOption(option)
    return () => chart.dispose()
  }, [option])

  return <div ref={ref} data-testid="chart" />
}

export default function Tool() {
  const optionDefs: readonly OptionDef<EmbeddingVisFormOptions>[] = [
    { key: 'dim', label: '维度', kind: 'select', values: [...EMBED_DIMS] },
  ]

  return (
    <MultiPanel<EmbeddingVisInput, EmbeddingVisFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ dim: '256' }}
      optionDefs={optionDefs}
      example={{
        text: [
          '水果：苹果香蕉橘子草莓',
          '水果：西瓜葡萄菠萝芒果',
          '交通：汽车火车飞机轮船',
          '交通：自行车地铁公交出租车',
          '动物：猫狗兔子仓鼠',
        ].join('\n'),
      }}
      renderOutput={(input, options) => {
        if (input.text.trim() === '') {
          return (
            <p className="text-sm text-slate-500">
              左侧每行输入一条「标签：文本」，这里展示 PCA 降维散点图。
            </p>
          )
        }
        const vis = computeVis(input.text, options.dim)
        if (!vis.ok) {
          return (
            <div
              role="alert"
              data-testid="error"
              className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
            >
              {vis.message}
            </div>
          )
        }
        return (
          <div className="flex flex-col gap-2">
            <ScatterView points={vis.data.points} />
            <p data-testid="points-info" className="text-xs text-slate-500 dark:text-slate-400">
              共 {vis.data.points.length} 个点（{vis.data.labels.join('、')}），悬停查看标签。
              注意：向量来自特征哈希（词袋统计），散点的聚集只反映用词重叠，不代表语义相似。
            </p>
          </div>
        )
      }}
      toText={(input, options) => {
        const vis = computeVis(input.text, options.dim)
        if (!vis.ok) return ''
        return vis.data.points
          .map((p) => `${p.label}：(${p.x.toFixed(4)}, ${p.y.toFixed(4)})`)
          .join('\n')
      }}
      downloadExt="txt"
    />
  )
}
