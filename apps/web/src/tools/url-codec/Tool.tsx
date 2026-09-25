import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { UrlCodecInput, UrlCodecOptions } from './schema'

const EXAMPLE: UrlCodecInput = { text: 'https://example.com/搜索?q=工具库&page=1' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<UrlCodecOptions>[] = [
    {
      key: 'direction',
      label: t('option.direction'),
      kind: 'select',
      values: ['encode', 'decode'],
    },
    {
      key: 'mode',
      label: t('option.mode'),
      kind: 'select',
      values: ['component', 'uri'],
    },
  ]

  return (
    <TwoColumn<UrlCodecInput, UrlCodecOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ direction: 'encode', mode: 'component' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
