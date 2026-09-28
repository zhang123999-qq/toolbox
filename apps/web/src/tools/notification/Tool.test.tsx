// @vitest-environment jsdom
/**
 * notification 组件测试（#865）：全局 Notification 全 mock。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

function stubNotification(opts?: {
  permission?: string
  askResult?: string
  deny?: boolean
}): void {
  if (opts?.deny) {
    vi.stubGlobal('Notification', undefined)
    return
  }
  const seen: Array<{ title: string; options?: object }> = []
  const Ctor = class {
    static permission = opts?.permission ?? 'default'
    static requestPermission = vi.fn(async () => opts?.askResult ?? 'granted')
    constructor(title: string, options?: object) {
      seen.push({ title, options })
    }
  }
  vi.stubGlobal('Notification', Ctor)
  vi.stubGlobal('__seenNotifications', seen)
}

function seenNotifications(): Array<{ title: string; options?: object }> {
  return (
    (globalThis as unknown as { __seenNotifications?: Array<{ title: string; options?: object }> })
      .__seenNotifications ?? []
  )
}

describe('notification · Tool', () => {
  it('初始展示当前权限标签', () => {
    stubNotification({ permission: 'granted' })
    render(<Tool />)
    expect(byTestId('notification-permission').textContent).toBe('已允许')
  })

  it('申请权限后更新权限标签', async () => {
    stubNotification({ permission: 'default', askResult: 'granted' })
    render(<Tool />)
    expect(byTestId('notification-permission').textContent).toBe('未请求')
    fireEvent.click(byTestId('notification-ask'))
    await waitFor(() => {
      expect(byTestId('notification-permission').textContent).toBe('已允许')
    })
  })

  it('有权限时发送测试通知', async () => {
    stubNotification({ permission: 'granted' })
    render(<Tool />)
    fireEvent.click(byTestId('notification-send'))
    await waitFor(() => {
      expect(byTestId('notification-result').textContent).toContain('已发送')
    })
    expect(seenNotifications()).toHaveLength(1)
    expect(seenNotifications()[0]?.title).toBe('Toolbox 通知测试')
  })

  it('无权限时发送被拦截并提示', () => {
    stubNotification({ permission: 'default' })
    render(<Tool />)
    fireEvent.click(byTestId('notification-send'))
    expect(byTestId('notification-error').textContent).toContain('尚未获得通知权限')
  })

  it('API 缺失时申请权限展示中文提示', async () => {
    stubNotification({ deny: true })
    render(<Tool />)
    expect(byTestId('notification-permission').textContent).toBe('未知')
    fireEvent.click(byTestId('notification-ask'))
    await waitFor(() => {
      expect(byTestId('notification-error').textContent).toContain('不支持 Notification API')
    })
  })
})
