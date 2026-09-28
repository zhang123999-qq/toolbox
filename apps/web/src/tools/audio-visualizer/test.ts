import { describe, expect, it } from 'vitest'
import {
  barWidthFor,
  clampByteValue,
  dbToHeight,
  encodeWavMono,
  getVisualStyle,
  indexToHue,
  makeExamplePcm,
  polarPoint,
  smoothValue,
  VISUAL_STYLES,
} from './utils'

describe('audio-visualizer / 样式定义', () => {
  it('内置三种样式', () => {
    expect(VISUAL_STYLES.map((s) => s.id)).toEqual(['bars', 'wave', 'circle'])
    expect(getVisualStyle('bars').label).toBe('柱状频谱')
    expect(getVisualStyle('wave').label).toBe('波形')
    expect(getVisualStyle('circle').label).toBe('圆形频谱')
  })

  it('未知样式抛中文错', () => {
    expect(() => getVisualStyle('unknown')).toThrow(/未知的可视化样式/)
    expect(() => getVisualStyle('')).toThrow(/未知的可视化样式/)
  })
})

describe('audio-visualizer / 数值映射', () => {
  it('dbToHeight 线性映射并钳制', () => {
    expect(dbToHeight(-100, -100, -30, 200)).toBe(0)
    expect(dbToHeight(-30, -100, -30, 200)).toBe(200)
    expect(dbToHeight(-65, -100, -30, 200)).toBe(100)
    // 超出区间被钳制
    expect(dbToHeight(-200, -100, -30, 200)).toBe(0)
    expect(dbToHeight(0, -100, -30, 200)).toBe(200)
  })

  it('dbToHeight 非法参数抛中文错', () => {
    expect(() => dbToHeight(-50, -30, -100, 200)).toThrow(/分贝区间非法/)
    expect(() => dbToHeight(-50, -50, -50, 200)).toThrow(/分贝区间非法/)
    expect(() => dbToHeight(-50, -100, -30, 0)).toThrow(/画布高度非法/)
    expect(() => dbToHeight(-50, -100, -30, -5)).toThrow(/画布高度非法/)
    expect(() => dbToHeight(Number.NaN, -100, -30, 200)).toThrow(/分贝值非法/)
    expect(() => dbToHeight(-50, Number.NaN, -30, 200)).toThrow(/最小分贝非法/)
    expect(() => dbToHeight(-50, -100, Number.POSITIVE_INFINITY, 200)).toThrow(/最大分贝非法/)
    expect(() => dbToHeight(-50, -100, -30, Number.NaN)).toThrow(/画布高度非法/)
  })

  it('smoothValue 指数平滑', () => {
    expect(smoothValue(0, 10, 0)).toBe(0)
    expect(smoothValue(0, 10, 1)).toBe(10)
    expect(smoothValue(0, 10, 0.5)).toBe(5)
    expect(smoothValue(10, 0, 0.25)).toBe(7.5)
  })

  it('smoothValue 非法系数抛中文错', () => {
    expect(() => smoothValue(0, 1, -0.1)).toThrow(/平滑系数非法/)
    expect(() => smoothValue(0, 1, 1.1)).toThrow(/平滑系数非法/)
    expect(() => smoothValue(Number.NaN, 1, 0.5)).toThrow(/旧值非法/)
    expect(() => smoothValue(0, Number.NaN, 0.5)).toThrow(/新值非法/)
    expect(() => smoothValue(0, 1, Number.NaN)).toThrow(/平滑系数非法/)
  })

  it('barWidthFor 计算柱宽', () => {
    expect(barWidthFor(100, 10, 2)).toBeCloseTo(8.2, 6)
    expect(barWidthFor(100, 1, 0)).toBe(100)
    expect(barWidthFor(10, 10, 0)).toBe(1)
  })

  it('barWidthFor 非法参数抛中文错', () => {
    expect(() => barWidthFor(0, 10, 2)).toThrow(/画布宽度非法/)
    expect(() => barWidthFor(-5, 10, 2)).toThrow(/画布宽度非法/)
    expect(() => barWidthFor(100, 0, 2)).toThrow(/频谱柱数量非法/)
    expect(() => barWidthFor(100, 2.5, 2)).toThrow(/频谱柱数量非法/)
    expect(() => barWidthFor(100, 10, -1)).toThrow(/柱间距非法/)
    expect(() => barWidthFor(10, 20, 0)).toThrow(/画布太窄/)
    expect(() => barWidthFor(Number.NaN, 10, 2)).toThrow(/画布宽度非法/)
    expect(() => barWidthFor(100, 10, Number.NaN)).toThrow(/柱间距非法/)
  })

  it('polarPoint 极坐标换算', () => {
    const p0 = polarPoint(100, 100, 50, 0)
    expect(p0.x).toBeCloseTo(150, 6)
    expect(p0.y).toBeCloseTo(100, 6)
    const p1 = polarPoint(100, 100, 50, Math.PI / 2)
    expect(p1.x).toBeCloseTo(100, 6)
    expect(p1.y).toBeCloseTo(150, 6)
    const p2 = polarPoint(0, 0, 0, 3)
    expect(p2.x).toBe(0)
    expect(p2.y).toBe(0)
  })

  it('polarPoint 非法参数抛中文错', () => {
    expect(() => polarPoint(0, 0, -1, 0)).toThrow(/半径非法/)
    expect(() => polarPoint(Number.NaN, 0, 1, 0)).toThrow(/圆心 x非法/)
    expect(() => polarPoint(0, Number.NaN, 1, 0)).toThrow(/圆心 y非法/)
    expect(() => polarPoint(0, 0, Number.NaN, 0)).toThrow(/半径非法/)
    expect(() => polarPoint(0, 0, 1, Number.NaN)).toThrow(/角度非法/)
  })

  it('indexToHue 均匀分布色相', () => {
    expect(indexToHue(0, 4)).toBe(0)
    expect(indexToHue(1, 4)).toBe(90)
    expect(indexToHue(2, 4)).toBe(180)
    expect(indexToHue(3, 4)).toBe(270)
    expect(indexToHue(0, 1)).toBe(0)
  })

  it('indexToHue 非法参数抛中文错', () => {
    expect(() => indexToHue(0, 0)).toThrow(/总数非法/)
    expect(() => indexToHue(0, 2.5)).toThrow(/总数非法/)
    expect(() => indexToHue(-1, 4)).toThrow(/序号非法/)
    expect(() => indexToHue(4, 4)).toThrow(/序号非法/)
    expect(() => indexToHue(1.5, 4)).toThrow(/序号非法/)
    expect(() => indexToHue(Number.NaN, 4)).toThrow(/序号非法/)
    expect(() => indexToHue(0, Number.NaN)).toThrow(/总数非法/)
  })

  it('clampByteValue 钳制到 0～255', () => {
    expect(clampByteValue(0)).toBe(0)
    expect(clampByteValue(128)).toBe(128)
    expect(clampByteValue(255)).toBe(255)
    expect(clampByteValue(-10)).toBe(0)
    expect(clampByteValue(300)).toBe(255)
    expect(() => clampByteValue(Number.NaN)).toThrow(/字节值非法/)
    expect(() => clampByteValue(Number.POSITIVE_INFINITY)).toThrow(/字节值非法/)
  })
})

describe('audio-visualizer / 示例音频', () => {
  it('makeExamplePcm 生成指定时长与采样率的 PCM', () => {
    const pcm = makeExamplePcm(8000, 2)
    expect(pcm.length).toBe(16000)
    let peak = 0
    for (const s of pcm) peak = Math.max(peak, Math.abs(s))
    expect(peak).toBeLessThanOrEqual(0.6 + 1e-9)
    expect(peak).toBeGreaterThan(0.3)
  })

  it('makeExamplePcm 非法参数抛中文错', () => {
    expect(() => makeExamplePcm(7999, 1)).toThrow(/采样率非法/)
    expect(() => makeExamplePcm(96001, 1)).toThrow(/采样率非法/)
    expect(() => makeExamplePcm(44100.5, 1)).toThrow(/采样率非法/)
    expect(() => makeExamplePcm(8000, 0)).toThrow(/时长非法/)
    expect(() => makeExamplePcm(8000, -1)).toThrow(/时长非法/)
    expect(() => makeExamplePcm(8000, 31)).toThrow(/时长非法/)
    expect(() => makeExamplePcm(Number.NaN, 1)).toThrow(/采样率非法/)
    expect(() => makeExamplePcm(8000, Number.NaN)).toThrow(/时长非法/)
  })

  it('encodeWavMono 生成合法 WAV 头', () => {
    const pcm = makeExamplePcm(8000, 0.5)
    const wav = encodeWavMono(pcm, 8000)
    expect(wav.length).toBe(44 + pcm.length * 2)
    const view = new DataView(wav.buffer)
    const ascii = (off: number, len: number): string => {
      let s = ''
      for (let i = 0; i < len; i++) s += String.fromCharCode(view.getUint8(off + i))
      return s
    }
    expect(ascii(0, 4)).toBe('RIFF')
    expect(ascii(8, 4)).toBe('WAVE')
    expect(ascii(36, 4)).toBe('data')
    expect(view.getUint32(24, true)).toBe(8000)
    expect(view.getUint16(22, true)).toBe(1)
  })

  it('encodeWavMono 钳制超范围采样并校验参数', () => {
    const wav = encodeWavMono(new Float32Array([-2, 2, 0.25]), 8000)
    const view = new DataView(wav.buffer)
    expect(view.getInt16(44, true)).toBe(-32767)
    expect(view.getInt16(46, true)).toBe(32767)
    expect(view.getInt16(48, true)).toBe(Math.round(0.25 * 32767))
    expect(() => encodeWavMono(new Float32Array(0), 8000)).toThrow(/音频数据为空/)
    expect(() => encodeWavMono(new Float32Array(10), 7999)).toThrow(/采样率非法/)
    expect(() => encodeWavMono(new Float32Array(10), 44100.5)).toThrow(/采样率非法/)
    expect(() => encodeWavMono(new Float32Array(10), Number.NaN)).toThrow(/采样率非法/)
  })
})
