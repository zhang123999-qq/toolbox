// @vitest-environment jsdom
/**
 * tilemap 组件测试（#788）：瓦片地图。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('tilemap · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    for (const id of [
      'tilemap-canvas',
      'tilemap-new',
      'tilemap-fill',
      'tilemap-import',
      'tilemap-export',
    ]) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('初始输出显示地图尺寸', () => {
    render(<Tool />)
    expect(byTestId('tilemap-output').textContent).toContain('地图 12×8')
  })

  it('新建地图更新尺寸', () => {
    render(<Tool />)
    fireEvent.change(byTestId('tilemap-cols'), { target: { value: '4' } })
    fireEvent.change(byTestId('tilemap-rows'), { target: { value: '3' } })
    fireEvent.click(byTestId('tilemap-new'))
    expect(byTestId('tilemap-output').textContent).toContain('地图 4×3')
  })

  it('非法尺寸显示错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('tilemap-cols'), { target: { value: '0' } })
    fireEvent.click(byTestId('tilemap-new'))
    expect(byTestId('tilemap-error').textContent).toContain('cols')
  })

  it('全图填充增加非空瓦片数', () => {
    render(<Tool />)
    expect(byTestId('tilemap-output').textContent).toContain('非空瓦片 0 块')
    fireEvent.click(byTestId('tilemap-fill'))
    expect(byTestId('tilemap-output').textContent).toContain('非空瓦片 96 块')
  })

  it('导入合法 JSON 更新地图', () => {
    render(<Tool />)
    const json = JSON.stringify({
      cols: 2,
      rows: 2,
      tileSize: 32,
      layers: [
        [
          [1, 2],
          [3, 0],
        ],
      ],
    })
    fireEvent.change(byTestId('input'), { target: { value: json } })
    fireEvent.click(byTestId('tilemap-import'))
    expect(byTestId('tilemap-output').textContent).toContain('地图 2×2')
    expect(byTestId('tilemap-output').textContent).toContain('非空瓦片 3 块')
  })

  it('导入非法 JSON 显示错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'not json' } })
    fireEvent.click(byTestId('tilemap-import'))
    expect(byTestId('tilemap-error').textContent).toContain('合法 JSON')
  })
})
