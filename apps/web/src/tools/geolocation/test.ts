/**
 * geolocation 工具测试（#863）：geolocation 经参数注入字面 mock。
 */
import { describe, expect, it } from 'vitest'
import { coordsToMapLink, formatCoords, getPosition } from './utils'
import type { GeoErrorLike, GeoPositionLike, GeolocationLike } from './utils'

function mockGeo(pos: GeoPositionLike | null, err?: GeoErrorLike): GeolocationLike {
  return {
    getCurrentPosition: (success, error) => {
      if (err && error) error(err)
      else if (pos) success(pos)
    },
  }
}

const FULL_POS: GeoPositionLike = {
  coords: {
    latitude: 31.2304,
    longitude: 121.4737,
    accuracy: 20.4,
    altitude: 12.5,
    altitudeAccuracy: 3,
    heading: 90,
    speed: 1.2,
  },
}

const MIN_POS: GeoPositionLike = {
  coords: { latitude: -23.5, longitude: -46.6, accuracy: -3 },
}

describe('geolocation · getPosition', () => {
  it('geo 为空时抛中文错', async () => {
    await expect(getPosition(null)).rejects.toThrow('不支持 Geolocation API')
    await expect(getPosition(undefined)).rejects.toThrow('不支持 Geolocation API')
  })

  it('无 getCurrentPosition 函数时抛中文错', async () => {
    await expect(getPosition({})).rejects.toThrow('不支持 Geolocation API')
  })

  it('成功时返回归一化坐标', async () => {
    const c = await getPosition(mockGeo(FULL_POS))
    expect(c.latitude).toBe(31.2304)
    expect(c.accuracy).toBe(20.4)
    expect(c.altitude).toBe(12.5)
    expect(c.heading).toBe(90)
    expect(c.speed).toBe(1.2)
  })

  it('缺失可选字段时归一化为 null', async () => {
    const c = await getPosition(mockGeo(MIN_POS))
    expect(c.altitude).toBeNull()
    expect(c.altitudeAccuracy).toBeNull()
    expect(c.heading).toBeNull()
    expect(c.speed).toBeNull()
  })

  it('错误码 1 映射为权限拒绝中文提示', async () => {
    await expect(getPosition(mockGeo(null, { code: 1, message: 'x' }))).rejects.toThrow(
      '拒绝了位置权限',
    )
  })

  it('错误码 2 映射为位置不可用提示', async () => {
    await expect(getPosition(mockGeo(null, { code: 2, message: 'x' }))).rejects.toThrow(
      '位置信息不可用',
    )
  })

  it('错误码 3 映射为超时提示', async () => {
    await expect(getPosition(mockGeo(null, { code: 3, message: 'x' }))).rejects.toThrow('定位超时')
  })

  it('未知错误码回退为原始 message', async () => {
    await expect(getPosition(mockGeo(null, { code: 99, message: 'boom' }))).rejects.toThrow('boom')
  })
})

describe('geolocation · formatCoords', () => {
  it('北纬东经格式化', () => {
    const c = {
      ...MIN_POS.coords,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    }
    expect(formatCoords(c)).toBe('纬度 23.5000°S，经度 46.6000°W，精度 ±0 米')
  })

  it('正纬度显示 N、正经度显示 E', () => {
    const c = {
      ...FULL_POS.coords,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    }
    expect(formatCoords(c)).toBe('纬度 31.2304°N，经度 121.4737°E，精度 ±20 米')
  })
})

describe('geolocation · coordsToMapLink', () => {
  it('生成 OSM 定位链接', () => {
    const link = coordsToMapLink(31.2304, 121.4737)
    expect(link).toContain('openstreetmap.org')
    expect(link).toContain('mlat=31.230400')
    expect(link).toContain('mlon=121.473700')
  })
})
