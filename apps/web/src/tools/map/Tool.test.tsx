// @vitest-environment jsdom
/**
 * map 组件测试：echarts 与 geoJSON 网络请求均被替换，
 * 聚焦加载态 / 错误态 / 注册流程 / PNG 下载。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'
import { EXAMPLE_REGIONS } from './utils'

const dispose = vi.fn()
const setOption = vi.fn()
const getDataURL = vi.fn(() => 'data:image/png;base64,AAA')
const init = vi.fn(() => ({ dispose, setOption, getDataURL }))
const registerMap = vi.fn()

vi.mock('echarts', () => ({
  init,
  registerMap,
}))

const VALID_GEOJSON = {
  type: 'FeatureCollection',
  features: [{ type: 'Feature', properties: { name: '广东' }, geometry: null }],
}

/** 每个用例独立 stub fetch，避免互相污染 */
function stubFetchOk(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, status: 200, json: async () => VALID_GEOJSON })),
  )
}

function stubFetchPending(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise<never>(() => {})),
  )
}

function stubFetchReject(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new Error('network down')
    }),
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

function outputAlert(): HTMLElement | null {
  return byTestId('output').querySelector('[role="alert"]')
}

describe('map · Tool', () => {
  it('初始显示地图数据加载中', () => {
    stubFetchPending()
    render(<Tool />)
    expect(byTestId('output').textContent).toContain('地图数据加载中')
  })

  it('geo 就绪后注册地图并渲染容器', async () => {
    stubFetchOk()
    render(<Tool />)
    await vi.waitFor(() =>
      expect(registerMap).toHaveBeenCalledWith('toolbox-china', expect.anything()),
    )
    expect(byTestId('chart-container')).toBeTruthy()
    expect(init).toHaveBeenCalled()
    expect(setOption).toHaveBeenCalled()
  })

  it('点示例填入示例数据', async () => {
    stubFetchOk()
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe(EXAMPLE_REGIONS)
    await vi.waitFor(() => expect(registerMap).toHaveBeenCalled())
  })

  it('fetch 拒错时 alert 提示需联网', async () => {
    stubFetchReject()
    render(<Tool />)
    await vi.waitFor(() => {
      const alert = outputAlert()
      expect(alert).toBeTruthy()
      expect(alert?.textContent).toContain('需联网')
    })
  })

  it('非法地区行进入错误态', () => {
    stubFetchPending()
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '只有一行' } })
    const alert = outputAlert()
    expect(alert).toBeTruthy()
    expect(alert?.textContent).toContain('格式非法')
  })

  it('切换到世界地图后注册 world 地图', async () => {
    stubFetchOk()
    render(<Tool />)
    await vi.waitFor(() =>
      expect(registerMap).toHaveBeenCalledWith('toolbox-china', expect.anything()),
    )
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'world' } })
    await vi.waitFor(() =>
      expect(registerMap).toHaveBeenCalledWith('toolbox-world', expect.anything()),
    )
  })

  it('点下载 PNG 触发 getDataURL 并下载 map.png', async () => {
    stubFetchOk()
    const clicked: HTMLAnchorElement[] = []
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(this)
    })
    try {
      render(<Tool />)
      await vi.waitFor(() => expect(init).toHaveBeenCalled())
      fireEvent.click(byTestId('download-png'))
      expect(getDataURL).toHaveBeenCalled()
      expect(clickSpy).toHaveBeenCalled()
      const anchor = clicked[clicked.length - 1]
      expect(anchor.download).toBe('map.png')
      expect(anchor.href).toContain('data:image/png')
    } finally {
      clickSpy.mockRestore()
    }
  })

  it('卸载时 dispose 图表实例', async () => {
    stubFetchOk()
    const { unmount } = render(<Tool />)
    await vi.waitFor(() => expect(init).toHaveBeenCalled())
    unmount()
    expect(dispose).toHaveBeenCalled()
  })
})
