import zxcvbn from 'zxcvbn'
import type { StrengthInput, StrengthOptions } from './schema'

/** zxcvbn 的 0–4 分对应的中文强度档位 */
export const LEVELS = ['极弱', '弱', '一般', '较强', '强'] as const

/** zxcvbn 的英文提示 → 中文（未命中的原样返回，不至于丢信息） */
export function translateMessage(message: string): string {
  const table: Record<string, string> = {
    'Use a few words, avoid common phrases': '用几个不相关的词拼起来，避免常见短语',
    'No need for symbols, digits, or uppercase letters':
      '不必刻意加符号、数字或大写字母（长度比花样更管用）',
    'Add another word or two. Uncommon words are better.': '再加一两个词，越不常见的词越好',
    'Straight rows of keys are easy to guess': '键盘上连成一排的按键很好猜',
    'Short keyboard patterns are easy to guess': '太短的键盘图案很好猜',
    'Use a longer keyboard pattern with more turns': '换个更长、转折更多的键盘图案',
    'Repeats like "aaa" are easy to guess': '“aaa” 这类重复很好猜',
    'Repeats like "abcabcabc" are only slightly harder to guess than "abc"':
      '“abcabcabc” 这类重复只比 “abc” 难一点点',
    'Avoid repeated words and characters': '避免重复的单词与字符',
    'Sequences like "abc" or "6543" are easy to guess': '“abc”“6543” 这类顺序序列很好猜',
    'Avoid sequences': '避免顺序序列',
    'Recent years are easy to guess': '近几年的年份很好猜',
    'Avoid recent years': '避免使用近几年的年份',
    'Avoid years that are associated with you': '避免与你相关的年份',
    'Dates are often easy to guess': '日期通常很好猜',
    'Avoid dates and years that are associated with you': '避免与你相关的日期与年份',
    'This is a top-10 common password': '这是排名前十的常见密码',
    'This is a top-100 common password': '这是排名前一百的常见密码',
    'This is a very common password': '这是非常常见的密码',
    'This is similar to a commonly used password': '它与某个常用密码很接近',
    'A word by itself is easy to guess': '单个单词很好猜',
    'Names and surnames by themselves are easy to guess': '单独的姓名很好猜',
    'Common names and surnames are easy to guess': '常见姓名很好猜',
    'Capitalization doesn\'t help very much': '只改大小写提升很有限',
    "All-uppercase is almost as easy to guess as all-lowercase": '全大写几乎和全小写一样好猜',
    "Reversed words aren't much harder to guess": '把单词倒过来并不会难多少',
    "Predictable substitutions like '@' instead of 'a' don't help very much":
      '用 @ 代替 a 这类可预测的替换提升很有限',
    'Avoid decades and years': '避免使用年份',
  }
  return table[message] ?? message
}

/** zxcvbn 的英文耗时 → 中文（"3 hours" / "centuries" / "less than a second"） */
export function translateDuration(duration: string): string {
  const value = duration.trim()
  const table: Record<string, string> = {
    'less than a second': '不到 1 秒',
    'centuries': '数百年',
  }
  if (table[value]) return table[value] as string
  const matched = /^(\d+)\s+(second|minute|hour|day|month|year)s?$/.exec(value)
  if (!matched) return value
  const units: Record<string, string> = {
    second: '秒',
    minute: '分钟',
    hour: '小时',
    day: '天',
    month: '个月',
    year: '年',
  }
  return `${matched[1]} ${units[matched[2] as string] ?? matched[2]}`
}

export interface Assessment {
  readonly score: number
  readonly level: string
  readonly online: string
  readonly offlineSlow: string
  readonly offlineFast: string
  readonly warning: string
  readonly suggestions: readonly string[]
}

/** 评估：zxcvbn 是确定性的，同样的口令永远得到同样的结论 */
export function assess(password: string): Assessment {
  const result = zxcvbn(password)
  const times = result.crack_times_display
  return {
    score: result.score,
    level: LEVELS[result.score] ?? '未知',
    online: translateDuration(times.online_no_throttling_10_per_second),
    offlineSlow: translateDuration(times.offline_slow_hashing_1e4_per_second),
    offlineFast: translateDuration(times.offline_fast_hashing_1e10_per_second),
    warning: result.feedback.warning === '' ? '' : translateMessage(result.feedback.warning),
    suggestions: result.feedback.suggestions.map(translateMessage),
  }
}

/** 输出：结论 + 三种破解场景 + 反馈 */
export function format(result: Assessment): string {
  const lines = [
    `强度 ${result.score} / 4（${result.level}）`,
    '',
    `在线破解（无限速，10 次/秒）：${result.online}`,
    `离线破解（慢哈希，1e4 次/秒）：${result.offlineSlow}`,
    `离线破解（快哈希，1e10 次/秒）：${result.offlineFast}`,
  ]
  if (result.warning !== '') lines.push('', '风险：' + result.warning)
  if (result.suggestions.length > 0) {
    lines.push('', '建议：')
    for (const item of result.suggestions) lines.push('- ' + item)
  }
  return lines.join('\n')
}

export function transform(input: StrengthInput, _options: StrengthOptions): string {
  if (input.text === '') return ''
  return format(assess(input.text))
}
