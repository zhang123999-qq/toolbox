export interface TagExtension {
  readonly singleton: string
  readonly subtags: string[]
}

export interface LanguageTagParts {
  readonly language: string
  readonly script?: string
  readonly region?: string
  readonly variants: string[]
  readonly extensions: TagExtension[]
  readonly privateUse: string[]
  /** 规范化后的标签 */
  readonly tag: string
}

const ALPHA_4 = /^[A-Za-z]{4}$/
const ALPHA_2 = /^[A-Za-z]{2}$/
const DIGIT_3 = /^[0-9]{3}$/
const VARIANT = /(?:^[A-Za-z0-9]{5,8}$)|(?:^[0-9][A-Za-z0-9]{3}$)/
const SUBTAG_2_8 = /^[A-Za-z0-9]{2,8}$/
const SUBTAG_1_8 = /^[A-Za-z0-9]{1,8}$/
const SINGLETON = /^[A-Za-z0-9]$/
const IS_X = /^[xX]$/

function titlecase(s: string): string {
  return s[0].toUpperCase() + s.slice(1).toLowerCase()
}

/**
 * 解析 BCP 47 语言标签（简化版，覆盖 language-script-region-variant-extension-privateuse）。
 * 非法标签抛中文错。
 */
export function parseLanguageTag(input: string): LanguageTagParts {
  const raw = input.trim().replace(/_/g, '-')
  if (raw === '') throw new Error('请输入语言标签')
  const subtags = raw.split('-')
  if (subtags.some((s) => s === '')) throw new Error(`语言标签「${input.trim()}」含空子标签`)

  // 纯私用标签：x-…
  if (IS_X.test(subtags[0])) {
    const rest = subtags.slice(1)
    if (rest.length === 0 || !rest.every((s) => SUBTAG_1_8.test(s))) {
      throw new Error('私用标签 x 后至少需要一个 1–8 位字母数字子标签')
    }
    const pu = rest.map((s) => s.toLowerCase())
    return {
      language: 'x',
      script: undefined,
      region: undefined,
      variants: [],
      extensions: [],
      privateUse: pu,
      tag: 'x-' + pu.join('-'),
    }
  }

  let i = 0
  const language = subtags[i++]
  if (!/^[A-Za-z]{2,8}$/.test(language)) {
    throw new Error(`语言子标签「${language}」非法：应为 2–8 个字母`)
  }

  let script: string | undefined
  let region: string | undefined
  const variants: string[] = []
  const extensions: TagExtension[] = []
  const privateUse: string[] = []

  if (i < subtags.length && ALPHA_4.test(subtags[i])) {
    script = titlecase(subtags[i++])
  }
  if (i < subtags.length && (ALPHA_2.test(subtags[i]) || DIGIT_3.test(subtags[i]))) {
    region = subtags[i].length === 3 ? subtags[i++] : subtags[i++].toUpperCase()
  }
  while (i < subtags.length && VARIANT.test(subtags[i])) {
    variants.push(subtags[i++].toLowerCase())
  }
  while (i < subtags.length && SINGLETON.test(subtags[i]) && !IS_X.test(subtags[i])) {
    const singleton = subtags[i++].toLowerCase()
    const ext: string[] = []
    while (i < subtags.length && SUBTAG_2_8.test(subtags[i])) {
      ext.push(subtags[i++].toLowerCase())
    }
    if (ext.length === 0) throw new Error(`扩展「${singleton}」后至少需要一个 2–8 位子标签`)
    extensions.push({ singleton, subtags: ext })
  }
  if (i < subtags.length) {
    if (!IS_X.test(subtags[i])) throw new Error(`子标签「${subtags[i]}」位置非法`)
    i++
    while (i < subtags.length && SUBTAG_1_8.test(subtags[i])) {
      privateUse.push(subtags[i++].toLowerCase())
    }
    if (privateUse.length === 0) {
      throw new Error('私用标签 x 后至少需要一个 1–8 位字母数字子标签')
    }
  }
  if (i < subtags.length) throw new Error(`子标签「${subtags[i]}」位置非法`)

  const out: string[] = [language.toLowerCase()]
  if (script) out.push(script)
  if (region) out.push(region)
  out.push(...variants)
  for (const e of extensions) out.push(e.singleton, ...e.subtags)
  if (privateUse.length > 0) out.push('x', ...privateUse)
  return {
    language: language.toLowerCase(),
    script,
    region,
    variants,
    extensions,
    privateUse,
    tag: out.join('-'),
  }
}

export interface BuildParts {
  readonly language: string
  readonly script?: string
  readonly region?: string
  readonly variants?: string[]
  readonly privateUse?: string[]
}

/** 由部件构建 BCP 47 标签（扩展暂不支持构建，仅解析） */
export function buildLanguageTag(parts: BuildParts): string {
  const language = parts.language.trim()
  if (!/^[A-Za-z]{2,8}$/.test(language))
    throw new Error(`语言子标签「${parts.language}」非法：应为 2–8 个字母`)
  const out = [language.toLowerCase()]
  if (parts.script !== undefined) {
    if (!ALPHA_4.test(parts.script.trim()))
      throw new Error(`文字子标签「${parts.script}」非法：应为 4 个字母`)
    out.push(titlecase(parts.script.trim()))
  }
  if (parts.region !== undefined) {
    const region = parts.region.trim()
    if (!ALPHA_2.test(region) && !DIGIT_3.test(region)) {
      throw new Error(`地区子标签「${parts.region}」非法：应为 2 个字母或 3 个数字`)
    }
    out.push(region.length === 3 ? region : region.toUpperCase())
  }
  for (const v of parts.variants ?? []) {
    if (!VARIANT.test(v.trim())) throw new Error(`变体子标签「${v}」非法`)
    out.push(v.trim().toLowerCase())
  }
  if (parts.privateUse !== undefined && parts.privateUse.length > 0) {
    const pu = parts.privateUse.map((s) => s.trim())
    if (!pu.every((s) => SUBTAG_1_8.test(s))) {
      throw new Error('私用子标签非法：每个应为 1–8 位字母数字')
    }
    out.push('x', ...pu.map((s) => s.toLowerCase()))
  }
  return out.join('-')
}

/** 校验标签是否合法 */
export function isValidLanguageTag(input: string): boolean {
  try {
    parseLanguageTag(input)
    return true
  } catch {
    return false
  }
}

const LANGUAGES: Record<string, string> = {
  zh: '中文',
  en: '英语',
  es: '西班牙语',
  hi: '印地语',
  ar: '阿拉伯语',
  pt: '葡萄牙语',
  bn: '孟加拉语',
  ru: '俄语',
  ja: '日语',
  pa: '旁遮普语',
  de: '德语',
  jv: '爪哇语',
  ko: '韩语',
  fr: '法语',
  te: '泰卢固语',
  mr: '马拉地语',
  tr: '土耳其语',
  ta: '泰米尔语',
  vi: '越南语',
  ur: '乌尔都语',
  it: '意大利语',
  th: '泰语',
  gu: '古吉拉特语',
  pl: '波兰语',
  uk: '乌克兰语',
  fa: '波斯语',
  ml: '马拉雅拉姆语',
  kn: '卡纳达语',
  or: '奥里亚语',
  my: '缅甸语',
  ha: '豪萨语',
  sw: '斯瓦希里语',
  nl: '荷兰语',
  id: '印尼语',
  ms: '马来语',
  fil: '菲律宾语',
  ro: '罗马尼亚语',
  hu: '匈牙利语',
  cs: '捷克语',
  el: '希腊语',
  sv: '瑞典语',
  da: '丹麦语',
  fi: '芬兰语',
  no: '挪威语',
  he: '希伯来语',
  yue: '粤语',
  bo: '藏语',
  ug: '维吾尔语',
  kk: '哈萨克语',
  mn: '蒙古语',
}

const SCRIPTS: Record<string, string> = {
  Hans: '简体',
  Hant: '繁体',
  Latn: '拉丁',
  Cyrl: '西里尔',
  Arab: '阿拉伯',
  Deva: '天城文',
  Jpan: '日文',
  Kore: '韩文',
  Thai: '泰文',
  Hebr: '希伯来',
  Grek: '希腊',
  Beng: '孟加拉',
  Taml: '泰米尔',
  Mymr: '缅甸',
  Khmr: '高棉',
}

const REGIONS: Record<string, string> = {
  CN: '中国',
  TW: '台湾',
  HK: '香港',
  MO: '澳门',
  US: '美国',
  GB: '英国',
  JP: '日本',
  KR: '韩国',
  DE: '德国',
  FR: '法国',
  RU: '俄罗斯',
  IN: '印度',
  BR: '巴西',
  ES: '西班牙',
  IT: '意大利',
  SG: '新加坡',
  MY: '马来西亚',
  TH: '泰国',
  VN: '越南',
  ID: '印尼',
  AU: '澳大利亚',
  CA: '加拿大',
  '419': '拉丁美洲',
  '001': '世界',
}

/** 查语言/文字/地区代码的中文名，未知返回 undefined。
 * 按 BCP 47 大小写规范区分部件：全大写 2 字母/3 数字→地区，首字母大写→文字，其余→语言 */
export function lookupLanguageName(code: string): string | undefined {
  const c = code.trim()
  if (c === '') return undefined
  if (/^[0-9]{3}$/.test(c) || /^[A-Z]{2}$/.test(c)) return REGIONS[c]
  if (/^[A-Z][a-z]{3}$/.test(c)) return SCRIPTS[c]
  return LANGUAGES[c.toLowerCase()]
}

/** 标签的人类可读描述，如「中文（繁体，台湾）」 */
export function describeTag(input: string): string {
  const p = parseLanguageTag(input)
  const langName = lookupLanguageName(p.language) ?? p.language
  const details: string[] = []
  if (p.script) details.push(lookupLanguageName(p.script) ?? p.script)
  if (p.region) details.push(lookupLanguageName(p.region) ?? p.region)
  for (const v of p.variants) details.push(lookupLanguageName(v) ?? v)
  for (const e of p.extensions) details.push(`扩展 ${e.singleton}：${e.subtags.join('-')}`)
  if (p.privateUse.length > 0) details.push(`私用：${p.privateUse.join('-')}`)
  return details.length > 0 ? `${langName}（${details.join('，')}）` : langName
}

/** 解析结果格式化为文本 */
export function formatTag(parts: LanguageTagParts): string {
  const lines = [
    `规范化标签：${parts.tag}`,
    `含义：${describeTag(parts.tag)}`,
    '',
    '组成部分：',
    `- 语言：${parts.language}`,
  ]
  if (parts.script) lines.push(`- 文字：${parts.script}`)
  if (parts.region) lines.push(`- 地区：${parts.region}`)
  for (const v of parts.variants) lines.push(`- 变体：${v}`)
  for (const e of parts.extensions) lines.push(`- 扩展 ${e.singleton}：${e.subtags.join('-')}`)
  if (parts.privateUse.length > 0) lines.push(`- 私用：x-${parts.privateUse.join('-')}`)
  return lines.join('\n')
}
