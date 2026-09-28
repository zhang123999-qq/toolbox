/**
 * notification —— 通知权限与发送的纯函数层
 *
 * Notification API 经参数注入（可为字面 mock）；
 * 权限申请兼容 Promise 式与回调式两种老 API。
 * 需要 HTTPS 环境，无 API 时抛中文错。
 */

/** 权限字符串（放宽为 string 以兼容 mock） */
export type NotificationPermissionLike = string

/** Notification 静态侧子集 */
export interface NotificationApiLike {
  readonly permission: NotificationPermissionLike
  requestPermission?: (callback?: (p: string) => void) => Promise<string> | void
}

/** Notification 构造器子集 */
export interface NotificationCtorLike {
  new (title: string, options?: object): unknown
}

/** 权限中文标签 */
export function permissionLabel(p: NotificationPermissionLike): string {
  switch (p) {
    case 'default':
      return '未请求'
    case 'granted':
      return '已允许'
    case 'denied':
      return '已拒绝'
    default:
      return '未知'
  }
}

/** 该权限是否允许发送通知 */
export function canSendNotification(p: NotificationPermissionLike): boolean {
  return p === 'granted'
}

/**
 * 申请通知权限。兼容 Promise 式（现代）与回调式（老 API）。
 * notif 为空或无 requestPermission 时抛中文错。
 */
export async function requestPermission(notif?: NotificationApiLike | null): Promise<string> {
  if (notif == null || typeof notif.requestPermission !== 'function') {
    throw new Error('当前浏览器不支持 Notification API（需要 HTTPS 环境）')
  }
  const fn = notif.requestPermission
  const result = fn()
  if (result != null && typeof (result as Promise<string>).then === 'function') {
    return result as Promise<string>
  }
  // 回调式老 API（返回 void，通过回调拿到结果）
  return new Promise<string>((resolve) => {
    fn((p: string) => resolve(p))
  })
}

/**
 * 发送一条通知。Ctor 为空时抛中文错；成功返回 true。
 * 组件中传入全局 Notification 构造器；测试中可注入字面 mock。
 */
export function sendNotification(
  Ctor?: NotificationCtorLike | null,
  title = '',
  body = '',
): boolean {
  if (Ctor == null) {
    throw new Error('当前浏览器不支持 Notification API')
  }
  new Ctor(title, body ? { body } : undefined)
  return true
}
