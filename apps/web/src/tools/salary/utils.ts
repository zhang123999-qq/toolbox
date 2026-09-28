import type { SalaryInput, SalaryOptions } from './schema'

/** 金额格式化：保留两位小数 */
const money = (n: number): string => n.toFixed(2)

/** 个税起征点（元/月） */
const TAX_THRESHOLD = 5000

/** 税前月薪合理上限（元），超出则拒绝 */
const MAX_SALARY = 10000000

interface TaxBracket {
  /** 本档上界；档位语义为 (上档上界, 本档上界]，末档上界为 +Infinity */
  readonly upTo: number
  /** 税率百分比整数（如 10 表示 10%）；用整数存，避免浮点展示尾巴 */
  readonly pct: number
  /** 速算扣除数（元） */
  readonly quick: number
}

/**
 * 中国个税月度税率表（工资薪金所得适用）。
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
 * 按月度税率表计算应缴个税。
 * 应纳税所得额 ≤ 0 时为 0；否则 所得额 × 税率 − 速算扣除数。
 */
export function calcIncomeTax(taxable: number): number {
  if (taxable <= 0) return 0
  // 末档上界为 +Infinity，find 必命中；断言仅为收窄 TS 类型
  const bracket = TAX_BRACKETS.find((b) => taxable <= b.upTo) as TaxBracket
  return (taxable * bracket.pct) / 100 - bracket.quick
}

/** 校验比例输入：NaN / <0 / >100 均非法 */
function parseRate(raw: string): number {
  const v = Number(raw)
  if (Number.isNaN(v) || v < 0 || v > 100) throw new Error('社保/公积金比例非法')
  return v
}

/** T2 同步入口 */
export function transform(input: SalaryInput, options: SalaryOptions): string {
  const text = input.text.trim()
  if (text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const salary = Number(text)
  if (Number.isNaN(salary)) throw new Error('税前月薪请输入有效的数字')
  if (salary <= 0) throw new Error('税前月薪必须大于 0')
  if (salary > MAX_SALARY) throw new Error('金额超出合理范围')

  const socialRate = parseRate(options.socialRate)
  const fundRate = parseRate(options.fundRate)

  const social = (salary * socialRate) / 100
  const fund = (salary * fundRate) / 100
  const taxable = salary - social - fund - TAX_THRESHOLD
  const tax = calcIncomeTax(taxable)
  const net = salary - social - fund - tax

  return [
    `税前月薪：${money(salary)} 元`,
    `社保个人缴纳（${options.socialRate}%）：${money(social)} 元`,
    `公积金个人缴纳（${options.fundRate}%）：${money(fund)} 元`,
    `应纳税所得额：${money(Math.max(taxable, 0))} 元`,
    `个人所得税：${money(tax)} 元`,
    `税后到手：${money(net)} 元`,
  ].join('\n')
}
