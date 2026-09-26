import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { FlexGeneratorInput, FlexGeneratorOptions } from './schema'

const EXAMPLE: FlexGeneratorInput = { text: 'generate' }

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<FlexGeneratorOptions>[] = [
    {
      key: 'direction',
      label: t('option.direction'),
      kind: 'select',
      values: ['row', 'row-reverse', 'column', 'column-reverse'],
    },
    {
      key: 'justify',
      label: '主轴对齐',
      kind: 'select',
      values: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'],
    },
    {
      key: 'align',
      label: '交叉轴对齐',
      kind: 'select',
      values: ['stretch', 'center', 'flex-start', 'flex-end', 'baseline'],
    },
    { key: 'wrap', label: '换行', kind: 'select', values: ['nowrap', 'wrap', 'wrap-reverse'] },
    { key: 'gap', label: '间距', kind: 'text', placeholder: '12px' },
  ]

  return (
    <TwoColumn<FlexGeneratorInput, FlexGeneratorOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        direction: 'row',
        justify: 'flex-start',
        align: 'stretch',
        wrap: 'nowrap',
        gap: '12px',
      }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
