import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { XmlFormatterInput, XmlFormatterOptions } from './schema'

const EXAMPLE: XmlFormatterInput = {
  text: '<?xml version="1.0" encoding="UTF-8"?>\n<catalog><book id="1"><title>工具库</title><price>29.9</price></book><book id="2"><title>XML 入门</title><price>39</price></book></catalog>',
}

export default function Tool() {
  const t = useTranslate()

  // 复用通用选项文案（option.*），铺量时无需为每个工具各建一套
  const optionDefs: readonly OptionDef<XmlFormatterOptions>[] = [
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['format', 'minify'] },
    { key: 'indent', label: t('option.indent'), kind: 'select', values: ['2', '4', 'tab'] },
  ]

  return (
    <TwoColumn<XmlFormatterInput, XmlFormatterOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 'format', indent: '2' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
