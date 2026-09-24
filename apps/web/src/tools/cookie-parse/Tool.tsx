import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { CookieInput, CookieOptions } from './schema'

const EXAMPLE: CookieInput = { text: 'sid=abc123; theme=dark; Path=/; HttpOnly; Secure' }

export default function Tool() {
  const t = useTranslate()

  const optionDefs: readonly OptionDef<CookieOptions>[] = [
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['parse', 'build'] },
    { key: 'sortKeys', label: t('option.sortKeys'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<CookieInput, CookieOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 'parse', sortKeys: false }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
