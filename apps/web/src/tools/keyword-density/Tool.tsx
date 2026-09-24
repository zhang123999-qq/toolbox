import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { KeywordDensityInput, KeywordDensityOptions } from './schema'

const EXAMPLE: KeywordDensityInput = {
  text: '在线工具库提供在线工具，在线工具全部在本地运行，本地运行不上传数据。',
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<KeywordDensityOptions>[] = [
    { key: 'topN', label: t('option.topN'), kind: 'select', values: [5, 10, 20] },
  ]

  return (
    <TwoColumn<KeywordDensityInput, KeywordDensityOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ topN: '10' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
