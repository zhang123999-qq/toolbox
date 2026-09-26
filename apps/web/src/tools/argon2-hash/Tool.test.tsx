// @vitest-environment jsdom
/**
 * argon2-hash 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * argon2-browser 自包含 bundled 产物在 Node/jsdom 里不跑真实 WASM，
 * 故这里用桩件替换（mock 路径与 utils.ts 动态 import 的自包含产物一致），被测的是组件交互与错误态。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

const hashMock = vi.fn(async () => ({
  encoded: '$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHRzYWx0c2FsdA$Y2hlY2tjaGVja2NoZWNrY2hlY2s',
  hash: new Uint8Array(32),
  hashHex: '00'.repeat(32),
}))
const verifyMock = vi.fn(async () => undefined)

vi.mock('argon2-browser/dist/argon2-bundled.min.js', () => ({
  default: {
    ArgonType: { Argon2d: 0, Argon2i: 1, Argon2id: 2 },
    hash: hashMock,
    verify: verifyMock,
  },
}))

afterEach(cleanup)

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

function output(): string {
  return byTestId('output').textContent ?? ''
}

describe('argon2-hash · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('待校验哈希有附加输入框', () => {
    render(<Tool />)
    expect(byTestId('input-hash')).toBeTruthy()
  })

  it('示例 → 运行 → 输出 PHC 串', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output()).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/), {
      timeout: 10000,
    })
  })

  it('校验方向 + 合法 PHC 串 → 校验通过', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'P@ssw0rd-demo' } })
    fireEvent.change(screen.getByLabelText('方向'), { target: { value: 'verify' } })
    fireEvent.change(byTestId('input-hash'), {
      target: {
        value: '$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHRzYWx0c2FsdA$Y2hlY2tjaGVja2NoZWNrY2hlY2s',
      },
    })
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output()).toContain('校验通过'), { timeout: 10000 })
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })

  it('校验方向 PHC 串非法时进入错误态（role=alert）', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'password' } })
    fireEvent.change(screen.getByLabelText('方向'), { target: { value: 'verify' } })
    fireEvent.change(byTestId('input-hash'), { target: { value: 'not-a-phc' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(byTestId('output').getAttribute('role')).toBe('alert'), {
      timeout: 10000,
    })
  })
})
