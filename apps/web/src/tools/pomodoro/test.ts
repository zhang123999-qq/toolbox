import { describe, expect, it } from 'vitest'
import {
  completesRound,
  formatPomo,
  nextPhase,
  parseMinutes,
  phaseDurationSeconds,
  pomoText,
} from './utils'

describe('pomodoro / parseMinutes', () => {
  it('空串回落默认值', () => {
    expect(parseMinutes('', 25)).toBe(25)
  })

  it('正常解析分钟', () => {
    expect(parseMinutes('30', 25)).toBe(30)
  })

  it('非整数 / 越界抛中文错', () => {
    expect(() => parseMinutes('abc', 25)).toThrow(/正整数/)
    expect(() => parseMinutes('0', 25)).toThrow(/1-180/)
    expect(() => parseMinutes('200', 25)).toThrow(/1-180/)
  })
})

describe('pomodoro / 阶段机', () => {
  it('工作结束进休息，休息结束回工作', () => {
    expect(nextPhase('work')).toBe('break')
    expect(nextPhase('break')).toBe('work')
  })

  it('只有工作段结束才记一个完整番茄', () => {
    expect(completesRound('work')).toBe(true)
    expect(completesRound('break')).toBe(false)
  })

  it('阶段时长换算成秒', () => {
    expect(phaseDurationSeconds('work', 25, 5)).toBe(1500)
    expect(phaseDurationSeconds('break', 25, 5)).toBe(300)
  })
})

describe('pomodoro / formatPomo & pomoText', () => {
  it('格式化为 mm:ss', () => {
    expect(formatPomo(1500)).toBe('25:00')
    expect(formatPomo(65)).toBe('01:05')
    expect(formatPomo(0)).toBe('00:00')
  })

  it('汇总配置文本', () => {
    expect(pomoText(25, 5)).toBe('番茄钟：工作 25 分钟 + 休息 5 分钟，循环进行')
  })
})
