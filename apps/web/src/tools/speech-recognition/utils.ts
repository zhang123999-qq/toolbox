/**
 * speech-recognition —— 语音命令词匹配的纯函数层
 *
 * 与 #555 音频转文字（连续听写）的区别：
 * 本工具是「命令匹配」：用户预设一组命令词，识别结果命中哪个就高亮哪个，
 * 不做全文转写；听写请用 #555。
 *
 * 本文件不触碰任何浏览器 API（SpeechRecognition 只在 Tool.tsx），
 * 可在 node 下被 vitest 完整测试。
 */

/** 支持的识别语言（与 #555 一致，独立声明以保持工具自治） */
export interface LangOption {
  readonly code: string
  readonly label: string
}

export const SUPPORTED_LANGS: readonly LangOption[] = [
  { code: 'zh-CN', label: '中文（简体）' },
  { code: 'zh-TW', label: '中文（繁体）' },
  { code: 'zh-HK', label: '粤语（香港）' },
  { code: 'en-US', label: '英语（美国）' },
  { code: 'en-GB', label: '英语（英国）' },
  { code: 'ja-JP', label: '日语' },
  { code: 'ko-KR', label: '韩语' },
  { code: 'fr-FR', label: '法语' },
  { code: 'de-DE', label: '德语' },
  { code: 'es-ES', label: '西班牙语' },
]

/** 命令词上限与单条长度上限 */
export const MAX_COMMANDS = 50
export const MAX_COMMAND_LEN = 100
/** 分隔符：换行、逗号（中英）、分号、顿号、空格 */
const SPLIT_RE = /[\n,，;；、\s]+/

/** 解析命令词文本 → 去空、保序去重；超限时截断并返回 truncated=true */
export function parseCommands(raw: string): { commands: string[]; truncated: boolean } {
  const seen = new Set<string>()
  const commands: string[] = []
  for (const piece of raw.split(SPLIT_RE)) {
    const t = piece.trim()
    if (t === '' || seen.has(t)) continue
    seen.add(t)
    if (commands.length >= MAX_COMMANDS) return { commands, truncated: true }
    commands.push(t)
  }
  return { commands, truncated: false }
}

/** 命令词列表合法性校验；非法抛中文错 */
export function validateCommands(commands: readonly string[]): string[] {
  if (commands.length === 0) throw new Error('请至少填写一个命令词')
  if (commands.length > MAX_COMMANDS) throw new Error(`命令词不能超过 ${MAX_COMMANDS} 个`)
  const seen = new Set<string>()
  const out: string[] = []
  for (const c of commands) {
    const t = c.trim()
    if (t === '') throw new Error('命令词不能为空白')
    if (t.length > MAX_COMMAND_LEN)
      throw new Error(`命令词太长（${t.length} 字）：${t.slice(0, 10)}…`)
    if (seen.has(t)) throw new Error(`命令词重复：${t}`)
    seen.add(t)
    out.push(t)
  }
  return out
}

/** 单条匹配结果 */
export interface CommandMatch {
  readonly command: string
  readonly index: number
}

/**
 * 命令词匹配：在识别文本中找每个命令词的首次出现位置，
 * 返回按出现顺序排列的命中列表；空文本返回空数组。
 */
export function matchCommands(transcript: string, commands: readonly string[]): CommandMatch[] {
  if (transcript === '') return []
  const matches: CommandMatch[] = []
  for (const command of commands) {
    if (command === '') continue
    const index = transcript.indexOf(command)
    if (index >= 0) matches.push({ command, index })
  }
  matches.sort((a, b) => a.index - b.index)
  return matches
}

/** 高亮区间 */
export interface HighlightRange {
  readonly start: number
  readonly end: number
}

/**
 * 把匹配结果转成高亮区间（起止为字符下标），自动按 start 排序并合并重叠区间。
 */
export function toHighlightRanges(
  transcript: string,
  matches: readonly CommandMatch[],
): HighlightRange[] {
  const ranges: HighlightRange[] = matches
    .filter((m) => m.command !== '')
    .map((m) => ({ start: m.index, end: m.index + m.command.length }))
    .filter((r) => r.start >= 0 && r.end <= transcript.length && r.start < r.end)
    .sort((a, b) => a.start - b.start)
  const merged: Array<{ start: number; end: number }> = []
  for (const r of ranges) {
    const last = merged[merged.length - 1]
    if (last && r.start <= last.end) {
      last.end = Math.max(last.end, r.end)
    } else {
      merged.push({ ...r })
    }
  }
  return merged
}

/** 匹配结果中文摘要 */
export function formatMatchSummary(matched: number, total: number): string {
  if (!Number.isInteger(matched) || matched < 0 || matched > total) {
    throw new Error(`匹配数非法：${String(matched)}`)
  }
  return `命中 ${matched}/${total} 个命令词`
}

/** 识别错误码 → 中文提示 */
export function speechErrorToChinese(error: string): string {
  switch (error) {
    case 'no-speech':
      return '没有检测到语音：请说出命令词后重试'
    case 'audio-capture':
      return '无法打开麦克风：请检查设备是否被占用'
    case 'not-allowed':
      return '麦克风权限被拒绝：请在浏览器地址栏允许麦克风访问后重试'
    case 'network':
      return '网络异常：语音识别需要联网，请检查网络后重试'
    case 'aborted':
      return '识别已中止'
    default:
      return `识别出错（${error}），请重试`
  }
}
