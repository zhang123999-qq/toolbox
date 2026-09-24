import { useI18n } from '../../i18n'
import { useTheme } from '../../theme'
import { MoonIcon, SunIcon } from '../ui/icons'
import { CONTROL_ICON_BUTTON } from './controls'

/**
 * 明暗主题开关
 *
 * 图标不做 React 条件渲染，而是「两个都渲染、由 CSS 二选一显示」：
 * 主题开关的真实状态在 <html> 上，React 只读不写首帧，
 * 交给 CSS 判定可以彻底避开状态与主题不同步的窗口期。
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const { t } = useI18n()

  const dark = theme === 'dark'

  return (
    <button
      type="button"
      data-testid="theme-toggle"
      aria-pressed={dark}
      aria-label={dark ? t('controls.themeToLight') : t('controls.themeToDark')}
      title={dark ? t('controls.themeToLight') : t('controls.themeToDark')}
      onClick={toggleTheme}
      className={CONTROL_ICON_BUTTON}
    >
      <MoonIcon className="block h-4 w-4 dark:hidden" />
      <SunIcon className="hidden h-4 w-4 dark:block" />
    </button>
  )
}
