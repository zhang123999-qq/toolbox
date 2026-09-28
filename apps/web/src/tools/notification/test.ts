/**
 * notification 工具测试（#865）：Notification 经参数注入字面 mock。
 */
import { describe, expect, it } from 'vitest'
import { canSendNotification, permissionLabel, requestPermission, sendNotification } from './utils'
import type { NotificationApiLike } from './utils'

describe('notification · permissionLabel', () => {
  it('三种权限映射中文', () => {
    expect(permissionLabel('default')).toBe('未请求')
    expect(permissionLabel('granted')).toBe('已允许')
    expect(permissionLabel('denied')).toBe('已拒绝')
  })

  it('未知权限回退为未知', () => {
    expect(permissionLabel('weird')).toBe('未知')
    expect(permissionLabel('')).toBe('未知')
  })
})

describe('notification · canSendNotification', () => {
  it('仅 granted 可发送', () => {
    expect(canSendNotification('granted')).toBe(true)
    expect(canSendNotification('default')).toBe(false)
    expect(canSendNotification('denied')).toBe(false)
  })
})

describe('notification · requestPermission', () => {
  it('notif 为空时抛中文错', async () => {
    await expect(requestPermission(null)).rejects.toThrow('不支持 Notification API')
    await expect(requestPermission(undefined)).rejects.toThrow('不支持 Notification API')
  })

  it('无 requestPermission 函数时抛中文错', async () => {
    const api: NotificationApiLike = { permission: 'default' }
    await expect(requestPermission(api)).rejects.toThrow('不支持 Notification API')
  })

  it('Promise 式 API 直接返回结果', async () => {
    const api: NotificationApiLike = {
      permission: 'default',
      requestPermission: () => Promise.resolve('granted'),
    }
    await expect(requestPermission(api)).resolves.toBe('granted')
  })

  it('回调式老 API 通过回调拿到结果', async () => {
    const api: NotificationApiLike = {
      permission: 'default',
      requestPermission: (cb?: (p: string) => void) => {
        cb?.('denied')
      },
    }
    await expect(requestPermission(api)).resolves.toBe('denied')
  })

  it('返回非 thenable 同步值时仍走回调分支', async () => {
    const api: NotificationApiLike = {
      permission: 'default',
      requestPermission: ((cb?: (p: string) => void) => {
        cb?.('granted')
        return 'sync' as unknown as void
      }) as NotificationApiLike['requestPermission'],
    }
    await expect(requestPermission(api)).resolves.toBe('granted')
  })
})

describe('notification · sendNotification', () => {
  it('Ctor 为空时抛中文错', () => {
    expect(() => sendNotification(null, 't')).toThrow('不支持 Notification API')
    expect(() => sendNotification(undefined, 't')).toThrow('不支持 Notification API')
  })

  it('成功构造返回 true 并透传标题正文', () => {
    const seen: Array<{ title: string; options?: object }> = []
    const Ctor = class {
      constructor(title: string, options?: object) {
        seen.push({ title, options })
      }
    }
    expect(sendNotification(Ctor, '标题', '正文')).toBe(true)
    expect(seen[0]?.title).toBe('标题')
    expect(seen[0]?.options).toEqual({ body: '正文' })
  })

  it('无正文时 options 为 undefined', () => {
    const seen: Array<{ title: string; options?: object }> = []
    const Ctor = class {
      constructor(title: string, options?: object) {
        seen.push({ title, options })
      }
    }
    sendNotification(Ctor, '标题')
    expect(seen[0]?.options).toBeUndefined()
  })
})
