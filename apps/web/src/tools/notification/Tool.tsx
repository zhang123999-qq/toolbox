import { useState } from 'react'
import { meta } from './meta'
import { canSendNotification, permissionLabel, requestPermission, sendNotification } from './utils'
import type { NotificationApiLike, NotificationCtorLike } from './utils'

const BTN_CLASS =
  'rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
const ROW_CLASS =
  'flex justify-between border-b border-slate-100 py-1.5 text-sm dark:border-slate-800'

/**
 * 通知测试：查看当前权限 → 申请权限 → 发送一条测试通知；
 * Notification 经类型断言传入 utils（组件不直接调用 API）。
 */
export default function Tool() {
  const [permission, setPermission] = useState<string>(() =>
    typeof Notification === 'undefined' ? 'unknown' : Notification.permission,
  )
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function api(): NotificationApiLike | null {
    if (typeof Notification === 'undefined') return null
    return Notification as unknown as NotificationApiLike
  }

  function ctor(): NotificationCtorLike | null {
    if (typeof Notification === 'undefined') return null
    return Notification as unknown as NotificationCtorLike
  }

  async function ask(): Promise<void> {
    setError('')
    setResult('')
    setBusy(true)
    try {
      const p = await requestPermission(api())
      setPermission(p)
      setResult(`当前权限：${permissionLabel(p)}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '申请失败')
    } finally {
      setBusy(false)
    }
  }

  function send(): void {
    setError('')
    setResult('')
    try {
      if (!canSendNotification(permission)) {
        throw new Error('尚未获得通知权限，请先申请')
      }
      sendNotification(ctor(), 'Toolbox 通知测试', '这是一条测试通知，说明通知功能正常')
      setResult('测试通知已发送（若未弹出请检查浏览器通知设置）')
    } catch (e) {
      setError(e instanceof Error ? e.message : '发送失败')
    }
  }

  return (
    <div className="space-y-4">
      <dl>
        <div className={ROW_CLASS}>
          <dt className="text-slate-500">当前权限</dt>
          <dd data-testid="notification-permission">{permissionLabel(permission)}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={BTN_CLASS}
          data-testid="notification-ask"
          disabled={busy}
          onClick={() => void ask()}
        >
          申请通知权限
        </button>
        <button type="button" className={BTN_CLASS} data-testid="notification-send" onClick={send}>
          发送测试通知
        </button>
      </div>
      {result && (
        <p
          className="text-sm text-emerald-700 dark:text-emerald-400"
          data-testid="notification-result"
        >
          {result}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600" data-testid="notification-error">
          {error}
        </p>
      )}
      <p className="text-xs text-slate-400">
        需要 HTTPS 环境；浏览器可能默认拦截非用户手势触发的通知。工具信息：{meta.title}（#865）
      </p>
    </div>
  )
}
