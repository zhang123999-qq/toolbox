import type { RegexCheatsheetInput, RegexCheatsheetOptions } from './schema'

/** 一条速查条目 */
export interface Entry {
  readonly category: 'web' | 'identity' | 'number' | 'date' | 'text'
  readonly name: string
  readonly pattern: string
  readonly note: string
}

/** 可选分类 */
export const CATEGORIES = ['all', 'web', 'identity', 'number', 'date', 'text'] as const

/** 分类中文名（用于输出标题） */
export const CATEGORY_LABEL: Record<Exclude<(typeof CATEGORIES)[number], 'all'>, string> = {
  web: '网络与地址',
  identity: '证件与账号',
  number: '数值',
  date: '日期与时间',
  text: '文本与用户名',
}

/** 常用正则速查表（16 条） */
export const ENTRIES: readonly Entry[] = [
  {
    category: 'web',
    name: '电子邮箱',
    pattern: '^[\\w.+-]+@[\\w-]+\\.[\\w.]+$',
    note: '通用邮箱格式校验',
  },
  {
    category: 'web',
    name: 'URL',
    pattern: '^https?://[\\w.-]+(?::\\d+)?(?:/\\S*)?$',
    note: 'http/https 链接',
  },
  {
    category: 'web',
    name: 'IPv4 地址',
    pattern: '^(?:\\d{1,3}\\.){3}\\d{1,3}$',
    note: '不校验每段 0-255',
  },
  {
    category: 'web',
    name: '十六进制颜色',
    pattern: '^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$',
    note: '#rgb 或 #rrggbb',
  },
  {
    category: 'identity',
    name: '中国大陆手机号',
    pattern: '^1[3-9]\\d{9}$',
    note: '11 位，第二位 3-9',
  },
  { category: 'identity', name: '身份证号(18位)', pattern: '^\\d{17}[\\dXx]$', note: '末位可为 X' },
  { category: 'identity', name: '邮政编码', pattern: '^\\d{6}$', note: '6 位数字' },
  { category: 'identity', name: 'QQ 号', pattern: '^[1-9]\\d{4,10}$', note: '5-11 位，首位非 0' },
  {
    category: 'identity',
    name: 'UUID',
    pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
    note: '标准 8-4-4-4-12',
  },
  { category: 'number', name: '整数', pattern: '^-?\\d+$', note: '含负号' },
  { category: 'number', name: '浮点数', pattern: '^-?\\d+\\.\\d+$', note: '必须带小数点' },
  { category: 'number', name: '十六进制数', pattern: '^0x[0-9a-fA-F]+$', note: '0x 前缀' },
  {
    category: 'date',
    name: '日期 YYYY-MM-DD',
    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
    note: '不校验合法月份日期',
  },
  {
    category: 'date',
    name: '时间 HH:MM:SS',
    pattern: '^\\d{2}:\\d{2}:\\d{2}$',
    note: '24 小时制格式',
  },
  {
    category: 'text',
    name: '纯中文',
    pattern: '^[\\u4e00-\\u9fa5]+$',
    note: '仅中日韩统一表意文字',
  },
  {
    category: 'text',
    name: '用户名',
    pattern: '^[a-zA-Z]\\w{5,17}$',
    note: '字母开头，6-18 位字母数字下划线',
  },
]

/** 按分类过滤条目 */
export function filterEntries(category: RegexCheatsheetOptions['category']): Entry[] {
  if (category === 'all') return [...ENTRIES]
  return ENTRIES.filter((e) => e.category === category)
}

/** 校验分类取值 */
export function assertCategory(category: string): void {
  if (!(CATEGORIES as readonly string[]).includes(category)) {
    throw new Error('不支持的分类：' + category)
  }
}

/** 渲染一条目 */
function renderEntry(e: Entry): string {
  return [`【${e.name}】`, `  正则: /${e.pattern}/`, `  说明: ${e.note}`].join('\n')
}

/** 主转换：空输入返回空串；任意输入即输出当前分类下的速查表 */
export function transform(input: RegexCheatsheetInput, options: RegexCheatsheetOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  assertCategory(options.category)
  const entries = filterEntries(options.category)
  const title = options.category === 'all' ? '全部常用正则' : CATEGORY_LABEL[options.category]
  return [`分类：${title}（${entries.length} 条）`, ''].concat(entries.map(renderEntry)).join('\n')
}
