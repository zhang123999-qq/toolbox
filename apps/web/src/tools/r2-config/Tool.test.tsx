// @vitest-environment jsdom
/**
 * r2-config 组件测试（#809）：TOML 生成与错误提示。
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

describe('r2-config · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'input-binding', 'input-previewBucketName', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('默认生成 r2_buckets 片段', () => {
    render(<Tool />)
    const toml = byTestId('r2-toml').textContent ?? ''
    expect(toml).toContain('[[r2_buckets]]')
    expect(toml).toContain('bucket_name = "my-bucket"')
  })

  it('大写桶名显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'MyBucket' } })
    expect(byTestId('r2-error').textContent).toContain('只能包含小写字母')
  })

  it('非法绑定名显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input-binding'), { target: { value: 'my-bucket' } })
    expect(byTestId('r2-error').textContent).toContain('合法 JS 标识符')
  })
})
