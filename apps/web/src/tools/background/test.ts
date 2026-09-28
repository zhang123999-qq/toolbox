/**
 * background（#779）utils 单测：Service Worker 后台脚本模板生成。
 */
import { describe, expect, it } from 'vitest'
import {
  EVENT_LABELS,
  EVENT_VALUES,
  generateBackground,
  parseBackgroundInput,
  validateBackgroundOptions,
} from './utils'

describe('validateBackgroundOptions', () => {
  it('合法配置通过', () => {
    expect(() =>
      validateBackgroundOptions({ events: ['alarms', 'runtime.onMessage'] }),
    ).not.toThrow()
    expect(() =>
      validateBackgroundOptions({ events: ['tabs.onUpdated'], keepAlive: true }),
    ).not.toThrow()
  })
  it('事件为空或缺失报错', () => {
    expect(() => validateBackgroundOptions({ events: [] })).toThrow('events 至少需要选择一个事件')
    expect(() => validateBackgroundOptions(null as never)).toThrow('events 至少需要选择一个事件')
    expect(() => validateBackgroundOptions({} as never)).toThrow('events 至少需要选择一个事件')
  })
  it('未知事件报错', () => {
    expect(() => validateBackgroundOptions({ events: ['nope' as never] })).toThrow('未知事件')
  })
  it('keepAlive 非布尔报错', () => {
    expect(() =>
      validateBackgroundOptions({ events: ['alarms'], keepAlive: 'yes' as never }),
    ).toThrow('keepAlive 必须是布尔值')
  })
})

describe('generateBackground', () => {
  it('按事件拼接对应片段', () => {
    const code = generateBackground({ events: ['runtime.onInstalled'] })
    expect(code).toContain('chrome.runtime.onInstalled.addListener')
    expect(code).toContain('service_worker')
  })
  it('多事件全部包含', () => {
    const code = generateBackground({ events: ['alarms', 'contextMenus', 'tabs.onUpdated'] })
    expect(code).toContain('chrome.alarms.create')
    expect(code).toContain('chrome.contextMenus.create')
    expect(code).toContain('chrome.tabs.onUpdated.addListener')
  })
  it('重复事件去重', () => {
    const code = generateBackground({ events: ['alarms', 'alarms'] })
    expect(code.match(/chrome\.alarms\.create\('tick'/g)?.length).toBe(1)
  })
  it('keepAlive 为 true 时追加 MV3 保活说明', () => {
    const code = generateBackground({ events: ['alarms'], keepAlive: true })
    expect(code).toContain('MV3 明确不支持 persistent')
    expect(code).toContain('chrome.storage')
  })
  it('keepAlive 缺省或 false 时不追加说明', () => {
    expect(generateBackground({ events: ['alarms'] })).not.toContain('MV3 明确不支持 persistent')
    expect(generateBackground({ events: ['alarms'], keepAlive: false })).not.toContain(
      'MV3 明确不支持 persistent',
    )
  })
  it('事件标签覆盖全部事件值', () => {
    for (const e of EVENT_VALUES) {
      expect(EVENT_LABELS[e]).toBeTruthy()
    }
  })
})

describe('parseBackgroundInput', () => {
  it('解析合法 JSON', () => {
    const opts = parseBackgroundInput('{"events":["runtime.onMessage"],"keepAlive":true}')
    expect(opts.events).toEqual(['runtime.onMessage'])
    expect(opts.keepAlive).toBe(true)
  })
  it('缺省 keepAlive 时为 undefined', () => {
    expect(parseBackgroundInput('{"events":["alarms"]}').keepAlive).toBeUndefined()
  })
  it('非法输入报错', () => {
    expect(() => parseBackgroundInput('')).toThrow('输入不能为空')
    expect(() => parseBackgroundInput('{bad')).toThrow('输入不是合法 JSON')
    expect(() => parseBackgroundInput('[1]')).toThrow('输入必须是 JSON 对象')
    expect(() => parseBackgroundInput('{}')).toThrow('events 至少需要选择一个事件')
    expect(() => parseBackgroundInput('{"events":["nope"]}')).toThrow('未知事件')
  })
})
