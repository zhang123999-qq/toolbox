import { describe, expect, it } from 'vitest'
import {
  MAX_COMMANDS,
  MAX_COMMAND_LEN,
  formatMatchSummary,
  matchCommands,
  parseCommands,
  speechErrorToChinese,
  toHighlightRanges,
  validateCommands,
} from './utils'

describe('speech-recognition / 命令词解析', () => {
  it('按换行/标点分隔，去空保序去重', () => {
    const { commands, truncated } = parseCommands('打开灯\n关灯，播放音乐；停止\n打开灯\n\n')
    expect(commands).toEqual(['打开灯', '关灯', '播放音乐', '停止'])
    expect(truncated).toBe(false)
  })

  it('空格与顿号也分隔', () => {
    expect(parseCommands('a b、c').commands).toEqual(['a', 'b', 'c'])
  })

  it('空输入返回空数组', () => {
    expect(parseCommands('')).toEqual({ commands: [], truncated: false })
    expect(parseCommands('  \n， ').commands).toEqual([])
  })

  it('超 50 个截断并标记', () => {
    const raw = Array.from({ length: 60 }, (_, i) => `命令${i}`).join('\n')
    const { commands, truncated } = parseCommands(raw)
    expect(commands.length).toBe(MAX_COMMANDS)
    expect(truncated).toBe(true)
  })
})

describe('speech-recognition / 命令词校验', () => {
  it('合法列表通过并原样返回', () => {
    expect(validateCommands(['打开灯', '关灯'])).toEqual(['打开灯', '关灯'])
  })

  it('空列表抛中文错', () => {
    expect(() => validateCommands([])).toThrow(/请至少填写一个命令词/)
  })

  it('超限抛中文错', () => {
    expect(() => validateCommands(Array(MAX_COMMANDS + 1).fill('a'))).toThrow(/不能超过/)
  })

  it('空白项抛中文错', () => {
    expect(() => validateCommands(['打开灯', ' '])).toThrow(/不能为空白/)
  })

  it('超长项抛中文错', () => {
    expect(() => validateCommands(['x'.repeat(MAX_COMMAND_LEN + 1)])).toThrow(/命令词太长/)
    expect(validateCommands(['x'.repeat(MAX_COMMAND_LEN)])).toHaveLength(1)
  })

  it('重复项抛中文错', () => {
    expect(() => validateCommands(['打开灯', '打开灯'])).toThrow(/命令词重复/)
  })
})

describe('speech-recognition / 匹配', () => {
  it('命中后按出现顺序返回', () => {
    const matches = matchCommands('请打开灯再关灯', ['关灯', '打开灯'])
    expect(matches).toEqual([
      { command: '打开灯', index: 1 },
      { command: '关灯', index: 5 },
    ])
  })

  it('未命中返回空数组', () => {
    expect(matchCommands('今天天气不错', ['打开灯'])).toEqual([])
  })

  it('空识别文本返回空数组', () => {
    expect(matchCommands('', ['打开灯'])).toEqual([])
  })

  it('空命令词被忽略', () => {
    expect(matchCommands('打开灯', ['', '打开灯'])).toEqual([{ command: '打开灯', index: 0 }])
  })
})

describe('speech-recognition / 高亮区间', () => {
  it('相邻区间合并为一段连续高亮', () => {
    const matches = matchCommands('打开灯关灯', ['打开灯', '关灯'])
    expect(toHighlightRanges('打开灯关灯', matches)).toEqual([{ start: 0, end: 5 }])
  })

  it('重叠区间合并', () => {
    const ranges = toHighlightRanges('打开灯', [
      { command: '打开灯', index: 0 },
      { command: '灯', index: 2 },
    ])
    expect(ranges).toEqual([{ start: 0, end: 3 }])
  })

  it('非法区间被过滤', () => {
    expect(toHighlightRanges('ab', [{ command: 'xyz', index: -1 }])).toEqual([])
  })

  it('无匹配时返回空数组', () => {
    expect(toHighlightRanges('abc', [])).toEqual([])
  })
})

describe('speech-recognition / 摘要与错误码', () => {
  it('摘要格式正确', () => {
    expect(formatMatchSummary(2, 5)).toBe('命中 2/5 个命令词')
    expect(formatMatchSummary(0, 3)).toBe('命中 0/3 个命令词')
  })

  it('匹配数非法抛中文错', () => {
    expect(() => formatMatchSummary(-1, 3)).toThrow(/匹配数非法/)
    expect(() => formatMatchSummary(4, 3)).toThrow(/匹配数非法/)
    expect(() => formatMatchSummary(1.5, 3)).toThrow(/匹配数非法/)
  })

  it('常见错误码有中文提示', () => {
    expect(speechErrorToChinese('no-speech')).toContain('没有检测到语音')
    expect(speechErrorToChinese('audio-capture')).toContain('无法打开麦克风')
    expect(speechErrorToChinese('not-allowed')).toContain('权限被拒绝')
    expect(speechErrorToChinese('network')).toContain('网络异常')
    expect(speechErrorToChinese('aborted')).toContain('已中止')
    expect(speechErrorToChinese('???')).toContain('???')
  })
})
