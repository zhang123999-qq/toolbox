/**
 * extension-icon（#774）utils 单测：图标参数校验与绘制逻辑。
 */
import { describe, expect, it, vi } from 'vitest'
import {
  buildIconSpec,
  drawIconOnContext,
  parseIconInput,
  renderIconDataUrl,
  validateIconParams,
  type IconCtx2D,
  type IconDrawSpec,
  type IconParams,
} from './utils'

const BASE: IconParams = {
  size: 48,
  bg: '#2563eb',
  fg: '#ffffff',
  letter: 'T',
  shape: 'rounded-square',
}

function mockCtx(): IconCtx2D & {
  calls: string[]
} {
  const calls: string[] = []
  const ctx = {
    calls,
    fillStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    fillRect: vi.fn((...a: number[]) => {
      calls.push(`fillRect(${a.join(',')})`)
    }),
    beginPath: vi.fn(() => {
      calls.push('beginPath')
    }),
    moveTo: vi.fn((...a: number[]) => {
      calls.push(`moveTo(${a.join(',')})`)
    }),
    lineTo: vi.fn((...a: number[]) => {
      calls.push(`lineTo(${a.join(',')})`)
    }),
    quadraticCurveTo: vi.fn((...a: number[]) => {
      calls.push(`quadraticCurveTo(${a.join(',')})`)
    }),
    closePath: vi.fn(() => {
      calls.push('closePath')
    }),
    arc: vi.fn((...a: number[]) => {
      calls.push(`arc(${a.join(',')})`)
    }),
    fill: vi.fn(() => {
      calls.push('fill')
    }),
    fillText: vi.fn((t: string, ...a: number[]) => {
      calls.push(`fillText(${t},${a.join(',')})`)
    }),
  }
  return ctx
}

describe('validateIconParams', () => {
  it('合法参数通过', () => {
    expect(() => validateIconParams(BASE)).not.toThrow()
    expect(() => validateIconParams({ ...BASE, shape: 'circle', letter: '工具' })).not.toThrow()
  })
  it('非对象报错', () => {
    expect(() => validateIconParams(undefined as never)).toThrow('必须是对象')
  })
  it('size 非法报错', () => {
    expect(() => validateIconParams({ ...BASE, size: 0 })).toThrow('size 必须是正整数')
    expect(() => validateIconParams({ ...BASE, size: 1.5 })).toThrow('size 必须是正整数')
  })
  it('颜色非法报错', () => {
    expect(() => validateIconParams({ ...BASE, bg: 'red' })).toThrow('bg 必须是 #rrggbb')
    expect(() => validateIconParams({ ...BASE, bg: '#12345' })).toThrow('bg 必须是 #rrggbb')
    expect(() => validateIconParams({ ...BASE, fg: '#gggggg' })).toThrow('fg 必须是 #rrggbb')
    expect(() => validateIconParams({ ...BASE, fg: 123 as never })).toThrow('fg 必须是 #rrggbb')
  })
  it('letter 非法报错', () => {
    expect(() => validateIconParams({ ...BASE, letter: '' })).toThrow('letter 需为 1～2 个字符')
    expect(() => validateIconParams({ ...BASE, letter: 'abc' })).toThrow('letter 需为 1～2 个字符')
  })
  it('shape 非法报错', () => {
    expect(() => validateIconParams({ ...BASE, shape: 'square' as never })).toThrow('shape 非法')
  })
})

describe('buildIconSpec', () => {
  it('生成纯数据规格', () => {
    const spec = buildIconSpec(BASE)
    expect(spec.size).toBe(48)
    expect(spec.fontPx).toBe(Math.round(48 * 0.55))
    expect(spec.cornerRadius).toBe(Math.round(48 * 0.22))
    expect(spec.bg).toBe('#2563eb')
  })
  it('小尺寸字体不小于 8px', () => {
    expect(buildIconSpec({ ...BASE, size: 8 }).fontPx).toBe(8)
  })
  it('非法参数抛错', () => {
    expect(() => buildIconSpec({ ...BASE, bg: 'x' })).toThrow('bg 必须是 #rrggbb')
  })
})

describe('drawIconOnContext', () => {
  it('圆角矩形绘制调用序列', () => {
    const ctx = mockCtx()
    const spec: IconDrawSpec = buildIconSpec(BASE)
    drawIconOnContext(spec, ctx)
    expect(ctx.calls[0]).toBe('beginPath')
    expect(ctx.calls).toContain('closePath')
    expect(ctx.calls.filter((c) => c.startsWith('quadraticCurveTo')).length).toBe(4)
    expect(ctx.calls).toContain('fill')
    expect(ctx.fillStyle).toBe('#ffffff')
    expect(ctx.font).toContain('bold')
    expect(ctx.textAlign).toBe('center')
    expect(ctx.textBaseline).toBe('middle')
    expect(ctx.calls.some((c) => c.startsWith('fillText(T,'))).toBe(true)
  })
  it('圆形绘制调用 arc', () => {
    const ctx = mockCtx()
    drawIconOnContext(buildIconSpec({ ...BASE, shape: 'circle' }), ctx)
    expect(ctx.calls.some((c) => c.startsWith('arc(24,24,24,'))).toBe(true)
    expect(ctx.calls.filter((c) => c.startsWith('quadraticCurveTo')).length).toBe(0)
  })
  it('超大圆角被钳制到 size/2', () => {
    const ctx = mockCtx()
    const spec: IconDrawSpec = { ...buildIconSpec(BASE), size: 10, cornerRadius: 100 }
    drawIconOnContext(spec, ctx)
    expect(ctx.calls).toContain('moveTo(5,0)')
  })
})

describe('renderIconDataUrl', () => {
  it('注入 canvas 工厂返回 dataURL', () => {
    const ctx = mockCtx()
    const url = renderIconDataUrl(BASE, () => ({
      getContext: () => ctx,
      toDataURL: (type?: string) => `data:${type};base64,AAA`,
    }))
    expect(url).toBe('data:image/png;base64,AAA')
  })
  it('工厂返回空抛错', () => {
    expect(() => renderIconDataUrl(BASE, () => null)).toThrow('无法创建 canvas')
    expect(() => renderIconDataUrl(BASE, () => undefined)).toThrow('无法创建 canvas')
  })
  it('getContext 返回空抛错', () => {
    expect(() =>
      renderIconDataUrl(BASE, () => ({ getContext: () => null, toDataURL: () => '' })),
    ).toThrow('无法获取 2d 绘图上下文')
  })
  it('非法参数抛错', () => {
    expect(() =>
      renderIconDataUrl({ ...BASE, size: -1 }, () => {
        throw new Error('不应被调用')
      }),
    ).toThrow('size 必须是正整数')
  })
})

describe('parseIconInput', () => {
  it('合法 JSON 解析', () => {
    const o = parseIconInput(
      '{"size":128,"bg":"#000000","fg":"#ffffff","letter":"AB","shape":"circle"}',
    )
    expect(o.size).toBe(128)
    expect(o.shape).toBe('circle')
    expect(o.letter).toBe('AB')
  })
  it('缺省字段有默认值', () => {
    const o = parseIconInput('{}')
    expect(o.size).toBe(48)
    expect(o.bg).toBe('#2563eb')
    expect(o.shape).toBe('rounded-square')
  })
  it('非字符串 shape 走默认', () => {
    const o = parseIconInput('{"shape":"triangle"}')
    expect(o.shape).toBe('rounded-square')
  })
  it('非法 JSON 报错', () => {
    expect(() => parseIconInput('{')).toThrow('不是合法 JSON')
  })
  it('非对象报错', () => {
    expect(() => parseIconInput('[1]')).toThrow('必须是 JSON 对象')
  })
  it('解析后仍做业务校验', () => {
    expect(() => parseIconInput('{"letter":"toolong!"}')).toThrow('letter 需为 1～2 个字符')
  })
})
