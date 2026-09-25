import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { DataUrlInput, DataUrlOptions } from './schema'

const EXAMPLE: DataUrlInput = { text: '工具库' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<DataUrlOptions>[] = [
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
      values: ['base64', 'url'],
    },
    {
      key: 'type',
      label: t('option.type'),
      kind: 'text',
      placeholder: 'text/plain',
    },
  ]

  return (
    <TwoColumn<DataUrlInput, DataUrlOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ direction: 'encode', mode: 'base64', type: 'text/plain' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
