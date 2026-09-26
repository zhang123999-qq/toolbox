import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { QrShareDevInput, QrShareDevOptions } from './schema'

const EXAMPLE: QrShareDevInput = { text: 'https://example.com/分享链接' }

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<QrShareDevOptions>[] = [
    { key: 'level', label: t('option.level'), kind: 'select', values: ['L', 'M', 'Q', 'H'] },
  ]

  return (
    <TwoColumn<QrShareDevInput, QrShareDevOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ level: 'M' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
      idleText="输入要分享的文本或链接，生成 SVG 二维码，手机扫码即可打开"
    />
  )
}
