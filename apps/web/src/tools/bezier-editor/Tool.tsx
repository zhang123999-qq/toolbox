import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { BezierEditorInput, BezierEditorOptions } from './schema'

const EXAMPLE: BezierEditorInput = { text: 'generate' }

export default function Tool() {
  const t = useTranslate()
  void t
  const optionDefs: readonly OptionDef<BezierEditorOptions>[] = [
    { key: 'x1', label: 'x1', kind: 'text', placeholder: '0.25' },
    { key: 'y1', label: 'y1', kind: 'text', placeholder: '0.1' },
    { key: 'x2', label: 'x2', kind: 'text', placeholder: '0.25' },
    { key: 'y2', label: 'y2', kind: 'text', placeholder: '1' },
  ]

  return (
    <TwoColumn<BezierEditorInput, BezierEditorOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ x1: '0.25', y1: '0.1', x2: '0.25', y2: '1' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
