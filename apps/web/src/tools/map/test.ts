import { describe, expect, it, vi } from 'vitest'
import {
  buildMapOption,
  EXAMPLE_REGIONS,
  fetchMapGeoJson,
  MAP_SOURCES,
  parseMapKind,
  parseRegionData,
  parseSize,
  parseTitle,
  transform,
} from './utils'
import type { FetchLike, FetchResponseLike, RegionValue } from './utils'
import type { MapInput } from './schema'

const input = (text: string): MapInput => ({ text })

function makeRes(partial: Partial<FetchResponseLike> = {}): FetchResponseLike {
  return {
    ok: true,
    status: 200,
    json: async () => ({ type: 'FeatureCollection', features: [] }),
    ...partial,
  }
}

function makeFetch(res: FetchResponseLike | Error): FetchLike {
  return () => {
    if (res instanceof Error) return Promise.reject(res)
    return Promise.resolve(res)
  }
}

describe('map / parseMapKind', () => {
  it('留空与 china 默认中国', () => {
    expect(parseMapKind('')).toBe('china')
    expect(parseMapKind('  ')).toBe('china')
    expect(parseMapKind('china')).toBe('china')
  })
  it('world 合法', () => {
    expect(parseMapKind('world')).toBe('world')
    expect(parseMapKind('  world ')).toBe('world')
  })
  it('非法值抛错', () => {
    expect(() => parseMapKind('usa')).toThrow(/地图类型非法：usa（须为 china \/ world）/)
  })
})

describe('map / parseRegionData', () => {
  it('正常解析多行', () => {
    const r = parseRegionData('广东:120\n北京:80')
    expect(r).toEqual([
      { name: '广东', value: 120 },
      { name: '北京', value: 80 },
    ])
  })
  it('全角冒号自动归一，支持小数与负数', () => {
    const r = parseRegionData('广东：120\n北京:-3.5')
    expect(r).toEqual([
      { name: '广东', value: 120 },
      { name: '北京', value: -3.5 },
    ])
  })
  it('空输入与空白行抛错', () => {
    expect(() => parseRegionData('')).toThrow(/地区数据不能为空/)
    expect(() => parseRegionData('  \n \n')).toThrow(/地区数据不能为空/)
  })
  it('无冒号行抛错', () => {
    expect(() => parseRegionData('只有一行')).toThrow(/格式非法：只有一行（应为 地区名:数值）/)
  })
  it('地区名为空抛错', () => {
    expect(() => parseRegionData(':5')).toThrow(/地区名不能为空/)
  })
  it('重复地区抛错', () => {
    expect(() => parseRegionData('广东:1\n广东:2')).toThrow(/重复的地区：广东/)
  })
  it('非法数值抛错', () => {
    expect(() => parseRegionData('广东:abc')).toThrow(/地区 广东 的数值非法：abc/)
    // Number('') 为 0（有限数），按 spec 不抛错；用真正非有限值
    expect(() => parseRegionData('广东:NaN')).toThrow(/地区 广东 的数值非法：NaN/)
  })
  it('示例数据可解析', () => {
    const r = parseRegionData(EXAMPLE_REGIONS)
    expect(r).toHaveLength(4)
    expect(r[0]).toEqual({ name: '广东', value: 120 })
  })
})

describe('map / fetchMapGeoJson', () => {
  it('合法 geoJSON 返回数据', async () => {
    const data = { type: 'FeatureCollection', features: [{ type: 'Feature' }] }
    const out = await fetchMapGeoJson('https://x/y.json', makeFetch(makeRes({ json: async () => data })))
    expect(out).toBe(data)
  })
  it('fetch 抛错时报网络错误', async () => {
    await expect(fetchMapGeoJson('https://x/y.json', makeFetch(new Error('boom')))).rejects.toThrow(
      /地图数据加载失败：网络错误，地图 geoJSON 需联网加载/,
    )
  })
  it('非 2xx 报 HTTP 状态', async () => {
    await expect(
      fetchMapGeoJson('https://x/y.json', makeFetch(makeRes({ ok: false, status: 404 }))),
    ).rejects.toThrow(/地图数据加载失败：HTTP 404，地图 geoJSON 需联网加载/)
  })
  it('非 JSON 报解析错误', async () => {
    const res = makeRes({
      json: () => Promise.reject(new Error('bad json')),
    })
    await expect(fetchMapGeoJson('https://x/y.json', makeFetch(res))).rejects.toThrow(
      /地图数据加载失败：返回内容不是合法 JSON/,
    )
  })
  it('形状非法：字符串', async () => {
    const res = makeRes({ json: async () => 'not-an-object' })
    await expect(fetchMapGeoJson('https://x/y.json', makeFetch(res))).rejects.toThrow(
      /地图数据加载失败：geoJSON 格式非法（缺少 features 数组）/,
    )
  })
  it('形状非法：null', async () => {
    const res = makeRes({ json: async () => null })
    await expect(fetchMapGeoJson('https://x/y.json', makeFetch(res))).rejects.toThrow(
      /geoJSON 格式非法/,
    )
  })
  it('形状非法：缺 features', async () => {
    const res = makeRes({ json: async () => ({ type: 'FeatureCollection' }) })
    await expect(fetchMapGeoJson('https://x/y.json', makeFetch(res))).rejects.toThrow(
      /geoJSON 格式非法/,
    )
  })
  it('fetchFn 被原样透传 url（不许默认值）', async () => {
    const fn = vi.fn(async (_url: string) => makeRes())
    await fetchMapGeoJson('https://geo.example/a.json', fn)
    expect(fn).toHaveBeenCalledWith('https://geo.example/a.json')
  })
})

describe('map / buildMapOption', () => {
  const regions: RegionValue[] = [
    { name: '广东', value: 120 },
    { name: '北京', value: 80 },
    { name: '上海', value: 150 },
    { name: '四川', value: 60 },
  ]
  it('计算 min/max 并构造 series', () => {
    const opt = buildMapOption('toolbox-china', '标题', regions)
    const visualMap = opt.visualMap as { min: number; max: number }
    expect(visualMap.min).toBe(60)
    expect(visualMap.max).toBe(150)
    expect(opt.title).toEqual({ text: '标题', left: 'center' })
    const series = (opt.series as Record<string, unknown>[])[0]
    expect(series.type).toBe('map')
    expect(series.map).toBe('toolbox-china')
    expect(series.roam).toBe(true)
    expect(series.data).toEqual([
      { name: '广东', value: 120 },
      { name: '北京', value: 80 },
      { name: '上海', value: 150 },
      { name: '四川', value: 60 },
    ])
    expect((opt.tooltip as { trigger: string }).trigger).toBe('item')
  })
  it('空 regions 时 min=0/max=100 且无标题', () => {
    const opt = buildMapOption('toolbox-world', '', [])
    const visualMap = opt.visualMap as { min: number; max: number }
    expect(visualMap.min).toBe(0)
    expect(visualMap.max).toBe(100)
    expect(opt).not.toHaveProperty('title')
    expect(((opt.series as Record<string, unknown>[])[0].data as unknown[])).toHaveLength(0)
  })
})

describe('map / parseSize & parseTitle', () => {
  it('标题 trim', () => {
    expect(parseTitle('  全国销量  ')).toBe('全国销量')
    expect(parseTitle('')).toBe('')
  })
  it('尺寸留空回退', () => {
    expect(parseSize('', '宽度', 600)).toBe(600)
    expect(parseSize('800', '宽度', 600)).toBe(800)
  })
  it('尺寸非法抛错', () => {
    expect(() => parseSize('abc', '宽度', 600)).toThrow(/宽度格式非法/)
    expect(() => parseSize('10', '宽度', 600)).toThrow(/宽度须在 100–2000/)
    expect(() => parseSize('5000', '高度', 400)).toThrow(/高度须在 100–2000/)
  })
})

describe('map / transform', () => {
  it('空输入用示例', () => {
    expect(transform(input(''))).toBe(EXAMPLE_REGIONS)
    expect(transform(input('   '))).toBe(EXAMPLE_REGIONS)
  })
  it('非空原样返回（trim 后）', () => {
    expect(transform(input('  广东:1  '))).toBe('广东:1')
  })
})

describe('map / MAP_SOURCES', () => {
  it('两个数据源形状完整', () => {
    expect(MAP_SOURCES.china.mapName).toBe('toolbox-china')
    expect(MAP_SOURCES.world.mapName).toBe('toolbox-world')
    expect(MAP_SOURCES.china.url).toContain('datav.aliyun.com')
    expect(MAP_SOURCES.world.url).toContain('jsdelivr.net')
  })
})
