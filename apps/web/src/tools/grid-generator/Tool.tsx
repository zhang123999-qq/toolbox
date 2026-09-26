import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { GridGeneratorInput, GridGeneratorOptions } from './schema'

const EXAMPLE: GridGeneratorInput = { text: 'generate' }

export default function Tool() {
  const t = useTranslate()
  void t
  const optionDefs: readonly OptionDef<GridGeneratorOptions>[] = [
    { key: 'columns', label: '列模板', kind: 'text', placeholder: '1fr 1fr 1fr' },
    { key: 'rows', label: '行模板', kind: 'text', placeholder: 'auto 1fr' },
    { key: 'gap', label: '间距', kind: 'text', placeholder: '12px' },
    {
      key: 'justifyItems',
      label: '水平对齐',
      kind: 'select',
      values: ['stretch', 'start', 'center', 'end'],
    },
    {
      key: 'alignItems',
      label: '垂直对齐',
      kind: 'select',
      values: ['stretch', 'start', 'center', 'end'],
    },
  ]

  return (
    <TwoColumn<GridGeneratorInput, GridGeneratorOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        columns: '1fr 1fr 1fr',
        rows: '',
        gap: '12px',
        justifyItems: 'stretch',
        alignItems: 'stretch',
      }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
