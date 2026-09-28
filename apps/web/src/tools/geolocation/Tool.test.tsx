// @vitest-environment jsdom
/**
 * geolocation 组件测试（#863）：navigator.geolocation 全 mock。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

function stubGeo(ok: boolean): void {
  Object.defineProperty(window.navigator, 'geolocation', {
    value: ok
      ? {
          getCurrentPosition: (success: (p: unknown) => void) =>
            success({
              coords: {
                latitude: 31.2304,
                longitude: 121.4737,
                accuracy: 20,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                speed: null,
              },
            }),
        }
      : undefined,
    configurable: true,
  })
}

describe('geolocation · Tool', () => {
  it('定位成功后展示坐标与地图链接', async () => {
    stubGeo(true)
    render(<Tool />)
    fireEvent.click(byTestId('geolocation-locate'))
    await waitFor(() => {
      expect(byTestId('geolocation-text').textContent).toContain('纬度 31.2304°N')
    })
    expect(byTestId('geolocation-altitude').textContent).toBe('未知')
    const link = byTestId('geolocation-map-link') as HTMLAnchorElement
    expect(link.href).toContain('openstreetmap.org')
  })

  it('定位失败后展示错误信息', async () => {
    stubGeo(false)
    render(<Tool />)
    fireEvent.click(byTestId('geolocation-locate'))
    await waitFor(() => {
      expect(byTestId('geolocation-error').textContent).toContain('不支持 Geolocation API')
    })
  })
})
