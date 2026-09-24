/**
 * 用户偏好（语言 / 主题）的落盘与读取
 *
 * ⚠️ 这里的 key 与 `apps/web/index.html` 中的内联脚本必须保持一致。
 * 内联脚本在首帧绘制前读取同一批 key 并把结果落到 <html> 上，
 * 否则会出现「先中文再翻英文」「先亮再变暗」的闪动。
 */

export const LOCALE_STORAGE_KEY = 'toolbox.locale'
export const THEME_STORAGE_KEY = 'toolbox.theme'

/** 语言待定期间挂在 <html> 上的类名，由内联脚本添加、Provider 挂载后移除 */
export const I18N_PENDING_CLASS = 'i18n-pending'

/** localStorage 在隐私模式 / 禁用 Cookie 时会抛错，统一降级为「无存储」 */
export function readStored(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStored(key: string, value: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // 存不下就算了，不退化为报错；偏好仅对本次会话生效
  }
}
