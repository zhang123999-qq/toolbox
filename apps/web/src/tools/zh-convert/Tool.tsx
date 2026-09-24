import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { ZhConvertInput, ZhConvertOptions } from './schema'

const EXAMPLE: ZhConvertInput = { text: '工具库软件，里面有很多实用的在线工具。' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<ZhConvertOptions>[] = [
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['s2t', 't2s', 's2tw'] },
  ]

  return (
    <TwoColumn<ZhConvertInput, ZhConvertOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 's2t' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
