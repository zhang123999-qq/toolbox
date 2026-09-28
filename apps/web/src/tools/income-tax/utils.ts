import type { IncomeTaxInput, IncomeTaxOptions } from './schema'

/** 金额格式化：保留两位小数 */
const money = (n: number): string => n.toFixed(2)

interface TaxBracket {
  /** 本档上界；档位语义为 (上档上界, 本档上界]，末档上界为 +Infinity */
  readonly upTo: number
  /** 税率百分比整数（如 10 表示 10%）；用整数存，避免浮点展示尾巴 */
  readonly pct: number
  /** 速算扣除数（元） */
  readonly quick: number
}

/**
 * 中国个税月度税率表。
 * 本工具自带一份，各工具独立维护，禁止跨工具 import。
 */
const TAX_BRACKETS: readonly TaxBracket[] = [
  { upTo: 3000, pct: 3, quick: 0 },
  { upTo: 12000, pct: 10, quick: 210 },
  { upTo: 25000, pct: 20, quick: 1410 },
  { upTo: 35000, pct: 25, quick: 2660 },
  { upTo: 55000, pct: 30, quick: 4410 },
  { upTo: 80000, pct: 35, quick: 7160 },
  { upTo: Number.POSITIVE_INFINITY, pct: 45, quick: 15160 },
]

/**
 * 按月应纳税所得额命中档位，返回税率百分比与速算扣除数。
 * income ≥ 0 时必命中（末档上界为 +Infinity）。
 */
export function lookupBracket(income: number): { pct: number; quick: number } {
  // 末档上界为 +Infinity，find 必命中；断言仅为收窄 TS 类型
  const bracket = TAX_BRACKETS.find((b) => income <= b.upTo) as TaxBracket
  return { pct: bracket.pct, quick: bracket.quick }
}

/** T2 同步入口 */
export function transform(input: IncomeTaxInput, _options: IncomeTaxOptions): string {
  const text = input.text.trim()
  if (text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const income = Number(text)
  if (Number.isNaN(income)) throw new Error('请输入有效的数字')
  if (income < 0) throw new Error('应纳税所得额不能为负数')

  const { pct, quick } = lookupBracket(income)
  const tax = (income * pct) / 100 - quick

  return [
    `应纳税所得额：${money(income)} 元`,
    `适用税率：${pct}%`,
    `速算扣除数：${money(quick)} 元`,
    `应缴个人所得税：${money(tax)} 元`,
  ].join('\n')
}
