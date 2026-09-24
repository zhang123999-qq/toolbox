import { LOCALES, useI18n } from '../../i18n'
import type { Locale } from '../../i18n'
import {
  CONTROL_GROUP,
  CONTROL_SEGMENT,
  CONTROL_SEGMENT_ACTIVE,
  CONTROL_SEGMENT_IDLE,
} from './controls'

/** 语言用母语简称显示：中文用户看「中」，英文用户看「EN」，无需再翻译一次 */
const SHORT_LABEL: Record<Locale, string> = { zh: '中', en: 'EN' }

/**
 * 语言切换（分段控件）
 * 点击即刻切换，选择写入 localStorage，刷新与再次访问时保持。
 * 尺寸固定为一个图标按钮的边长 × 2，移动端与主题开关并排也不挤。
 */
export function LanguageSwitch() {
  const { locale, setLocale, t } = useI18n()

  return (
    <div
      role="group"
      data-testid="language-switch"
      aria-label={t('controls.languageLabel')}
      className={CONTROL_GROUP}
    >
      {LOCALES.map((value) => {
        const active = locale === value
        return (
          <button
            key={value}
            type="button"
            data-testid={`locale-${value}`}
            aria-label={value === 'zh' ? t('controls.langZh') : t('controls.langEn')}
            aria-pressed={active}
            onClick={() => setLocale(value)}
            className={`${CONTROL_SEGMENT} ${active ? CONTROL_SEGMENT_ACTIVE : CONTROL_SEGMENT_IDLE}`}
          >
            {SHORT_LABEL[value]}
          </button>
        )
      })}
    </div>
  )
}
