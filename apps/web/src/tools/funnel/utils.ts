import type { FunnelInput } from './schema'

/** 漏斗阶段：名称 + 数值 */
export interface FunnelStage {
  readonly name: string
  readonly value: number
}

/** 内置示例数据 */
export const EXAMPLE_DATA = `访问:10000
注册:3000
下单:800
支付:500`

/**
 * 全角冒号归一化。
 * 纯函数：无分支。
 */
function normalizeColon(raw: string): string {
  return raw.replace(/：/g, ':')
}

/** 保留 1 位小数 */
function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/**
 * 解析漏斗数据：每行「阶段名:数值」。
 * 纯函数：空输入 / 空行 / 无冒号 / 阶段名空 / 重复 / 数值非法 / 负数 /
 * 阶段数不足 2 个都抛中文错。
 */
export function parseFunnelData(raw: string): FunnelStage[] {
  const text = normalizeColon(raw).trim()
  if (text === '') {
    throw new Error('漏斗数据不能为空：每行一个阶段，格式为「阶段名:数值」')
  }
  const stages: FunnelStage[] = []
  const seen = new Set<string>()
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line === '') {
      throw new Error('漏斗数据不能为空行')
    }
    const idx = line.indexOf(':')
    if (idx === -1) {
      throw new Error(`数据行格式非法：${line}（须为「阶段名:数值」）`)
    }
    const name = line.slice(0, idx).trim()
    if (name === '') {
      throw new Error(`数据行格式非法：${line}（阶段名不能为空）`)
    }
    if (seen.has(name)) {
      throw new Error(`阶段名重复：${name}`)
    }
    seen.add(name)
    const value = Number(line.slice(idx + 1).trim())
    if (!Number.isFinite(value)) {
      throw new Error(`阶段「${name}」的数值非法：须为数字`)
    }
    if (value < 0) {
      throw new Error(`阶段「${name}」的数值不能为负数`)
    }
    stages.push({ name, value })
  }
  if (stages.length < 2) {
    throw new Error('漏斗至少需要 2 个阶段')
  }
  return stages
}

/**
 * 计算各阶段相对首阶段的转化率（百分比，保留 1 位小数）。
 * 首阶段为 0 时转化率记为 0，避免除零。
 * 纯函数。
 */
export function conversionRates(stages: readonly FunnelStage[]): number[] {
  const base = stages[0].value
  return stages.map((s) => (base === 0 ? 0 : round1((s.value / base) * 100)))
}

/**
 * 从解析结果构建 echarts funnel option（纯对象，不依赖 echarts 运行时）。
 * label formatter 为函数：测试可直接调用断言；title 为空时不带 title 字段。
 */
export function buildFunnelOption(
  stages: readonly FunnelStage[],
  title: string,
): Record<string, unknown> {
  const rates = conversionRates(stages)
  const base: Record<string, unknown> = {
    tooltip: { trigger: 'item', formatter: '{b}: {c}' },
    series: [
      {
        type: 'funnel',
        left: '10%',
        width: '80%',
        label: {
          show: true,
          formatter: (p: { dataIndex: number; name: string; value: number }) =>
            `${p.name}\n${p.value}（转化率 ${rates[p.dataIndex]}%）`,
        },
        data: stages.map((s) => ({ name: s.name, value: s.value })),
      },
    ],
  }
  if (title !== '') {
    return { title: { text: title, left: 'center' }, ...base }
  }
  return base
}

/** 解析标题：留空返回空串（不显示标题） */
export function parseTitle(raw: string): string {
  return raw.trim()
}

/** 解析尺寸：100–2000，留空回 fallback */
export function parseSize(raw: string, name: string, fallback: number): number {
  const v = raw.trim()
  if (v === '') return fallback
  const n = Number(v)
  if (!Number.isFinite(n)) throw new Error(`${name}格式非法：${v}（须为数字）`)
  if (n < 100 || n > 2000) throw new Error(`${name}须在 100–2000 之间（当前 ${v}）`)
  return n
}

/** T3 toText 入口：空输入用示例 */
export function transform(input: FunnelInput): string {
  const text = input.text.trim()
  if (text === '') return EXAMPLE_DATA
  return text
}
