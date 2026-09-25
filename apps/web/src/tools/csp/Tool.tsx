import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { CspInput, CspOptions } from './schema'

/** 输入框只作触发用：点「示例」把内容填成固定占位符，随即生成一份策略 */
const EXAMPLE: CspInput = { text: 'generate' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  // 标签与 CSP 语义的映射见 README 的对照表（词典里没有「内联脚本 / eval」这类文案）
  const optionDefs: readonly OptionDef<CspOptions>[] = [
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['header', 'report-only'] },
    { key: 'target', label: t('option.target'), kind: 'select', values: ['self', 'none'] },
    { key: 'strict', label: t('option.strict'), kind: 'boolean' },
    { key: 'includeLower', label: t('option.includeLower'), kind: 'boolean' },
    { key: 'includeUpper', label: t('option.includeUpper'), kind: 'boolean' },
    { key: 'includeNumbers', label: t('option.includeNumbers'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<CspInput, CspOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        mode: 'header',
        target: 'self',
        strict: true,
        includeLower: false,
        includeUpper: false,
        includeNumbers: false,
      }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
