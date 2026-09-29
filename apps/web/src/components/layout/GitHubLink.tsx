import { useI18n } from '../../i18n'
import { GitHubIcon } from '../ui/icons'
import { CONTROL_ICON_BUTTON } from './controls'

const GITHUB_URL = 'https://github.com/zhang123999-qq/toolbox'

/**
 * GitHub 仓库跳转链接
 *
 * 与主题开关同一套外观（CONTROL_ICON_BUTTON），放在顶栏最右侧；
 * 新窗口打开，不干扰当前浏览。
 */
export function GitHubLink() {
  const { t } = useI18n()

  return (
    <a
      href={GITHUB_URL}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="github-link"
      aria-label={t('controls.github')}
      title={t('controls.github')}
      className={CONTROL_ICON_BUTTON}
    >
      <GitHubIcon className="h-4 w-4" />
    </a>
  )
}
