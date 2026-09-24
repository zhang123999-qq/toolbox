import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { BomInput, BomOptions } from './schema'

const EXAMPLE: BomInput = { text: '﻿第一行\n第二行' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<BomOptions>[] = [
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['detect', 'add', 'remove'] },
  ]

  return (
    <TwoColumn<BomInput, BomOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 'detect' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
