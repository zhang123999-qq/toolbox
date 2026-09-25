import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { MimeEncodeInput, MimeEncodeOptions } from './schema'

const EXAMPLE: MimeEncodeInput = { text: '工具库' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<MimeEncodeOptions>[] = [
    {
      key: 'direction',
      label: t('option.direction'),
      kind: 'select',
      values: ['encode', 'decode'],
    },
    {
      key: 'charset',
      label: t('option.charset'),
      kind: 'select',
      values: ['UTF-8', 'GB2312', 'ISO-8859-1'],
    },
    {
      key: 'mode',
      label: t('option.mode'),
      kind: 'select',
      // B = base64，Q = quoted-printable 变体
      values: ['B', 'Q'],
    },
  ]

  return (
    <TwoColumn<MimeEncodeInput, MimeEncodeOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ direction: 'encode', charset: 'UTF-8', mode: 'B' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
