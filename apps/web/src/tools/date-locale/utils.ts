export interface LocaleOption {
readonly code: string
readonly label: string
}

/** 内置常用语言区域（≥20） */
export const LOCALES: LocaleOption[] = [
{ code: 'zh-CN', label: '简体中文（中国大陆）'},
{ code: 'zh-TW', label: '繁体中文（台湾）'},
{ code: 'zh-HK', label: '繁体中文（香港）'},
{ code: 'en-US', label: '英语（美国）'},
{ code: 'en-GB', label: '英语（英国）'},
{ code: 'ja-JP', label: '日语'},
{ code: 'ko-KR', label: '韩语'},
{ code: 'ar-SA', label: '阿拉伯语（沙特）'},
{ code: 'ar-EG', label: '阿拉伯语（埃及）'},
{ code: 'he-IL', label: '希伯来语'},
{ code: 'de-DE', label: '德语'},
{ code: 'fr-FR', label: '法语'},
{ code: 'es-ES', label: '西班牙语'},
{ code: 'it-IT', label: '意大利语'},
{ code: 'pt-BR', label: '葡萄牙语（巴西）'},
{ code: 'ru-RU', label: '俄语'},
{ code: 'th-TH', label: '泰语'},
{ code: 'vi-VN', label: '越南语'},
{ code: 'id-ID', label: '印尼语'},
{ code: 'ms-MY', label: '马来语'},
{ code: 'hi-IN', label: '印地语'},
{ code: 'tr-TR', label: '土耳其语'},
{ code: 'nl-NL', label: '荷兰语'},
]

export interface DateLocaleResult {
readonly locale: string
readonly label: string
readonly date: string
readonly time: string
readonly datetime: string
}

/** 解析逗号分隔的 locale 列表：大小写不敏感、去重；未知代码抛中文错 */
export function resolveLocales(input: string): LocaleOption[] {
const codes = input
.split(/[,\s，、]+/)
.map((s) => s.trim())
.filter((s) => s!== '')
if (codes.length === 0) throw new Error('请至少选择一个语言区域')
const out: LocaleOption[] = []
for (const c of codes) {
const key = c.toLowerCase()
const opt = LOCALES.find((l) => l.code.toLowerCase() === key)
if (!opt) throw new Error(`未知语言区域：${c}`)
if (!out.some((o) => o.code === opt.code)) out.push(opt)
}
return out
}

function parseDateInput(dateInput: string): Date {
const text = dateInput.trim()
if (text === '') throw new Error('请输入日期')
const d = new Date(text)
if (Number.isNaN(d.getTime())) throw new Error(`无法解析日期：${text}`)
return d
}

/**
* 同一日期在多个语言区域下的并排本地化展示（Intl.DateTimeFormat 真实调用）。
* 与 date-format（自定义格式串）差异化：本工具做多 locale 对比。
*/
export function formatDateLocales(dateInput: string, localesInput: string): DateLocaleResult[] {
const d = parseDateInput(dateInput)
return resolveLocales(localesInput).map((opt) => ({
locale: opt.code,
label: opt.label,
date: new Intl.DateTimeFormat(opt.code, { dateStyle: 'medium'}).format(d),
time: new Intl.DateTimeFormat(opt.code, { timeStyle: 'medium'}).format(d),
datetime: new Intl.DateTimeFormat(opt.code, { dateStyle: 'medium', timeStyle: 'medium'}).format(d),
}))
}

type TimeUnit = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second'
const TIME_UNITS: [TimeUnit, number][] = [
['year', 365 * 86400000],
['month', 30 * 86400000],
['day', 86400000],
['hour', 3600000],
['minute', 60000],
['second', 1000],
]

/** 相对时间中文表达（如「3 天前」「2 天后」「现在」）；now 可注入便于测试 */
export function relativeTimeZh(dateInput: string, now: Date = new Date()): string {
const d = parseDateInput(dateInput)
const diff = d.getTime() - now.getTime()
const abs = Math.abs(diff)
let unit: TimeUnit = 'second'
let ms = 1000
for (const [u, m] of TIME_UNITS) {
unit = u
ms = m
if (abs >= m) break
}
const value = Math.round(diff / ms)
return new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto'}).format(value, unit)
}

/** 本地化结果格式化为文本 */
export function formatDateLocaleResults(results: DateLocaleResult[], relative: string): string {
const lines = [`相对时间：${relative}`, '']
for (const r of results) {
lines.push(`[${r.label} | ${r.locale}]`)
lines.push(`日期：${r.date}`)
lines.push(`时间：${r.time}`)
lines.push(`日期时间：${r.datetime}`)
lines.push('')
}
return lines.join('\n').trimEnd()
}
