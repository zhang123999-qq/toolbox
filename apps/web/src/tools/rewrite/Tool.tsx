import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { AI_ENV_DEFAULTS } from '../../lib/ai'
import { transform } from './utils'
import type { RewriteInput, RewriteOptions } from './schema'

const EXAMPLE: RewriteInput = {
  text: '这个东西挺好的，就是有点小问题，你看看能不能改一下。',
  apiBase: '',
  apiKey: '',
  model: '',
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<RewriteOptions>[] = [
    {
      key: 'style',
      label: t('option.style'),
      kind: 'select',
      values: ['polish', 'formal', 'casual', 'concise', 'expand'],
    },
  ]

  return (
    <TwoColumn<RewriteInput, RewriteOptions>
      meta={meta}
      initialInput={{
        text: '',
        apiBase: AI_ENV_DEFAULTS.apiBase,
        apiKey: '',
        model: AI_ENV_DEFAULTS.model,
      }}
      initialOptions={{ style: 'polish' }}
      runAsync={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[
        { key: 'apiBase', label: t('tool.apiBase'), rows: 1 },
        { key: 'apiKey', label: t('tool.apiKey'), rows: 1 },
        { key: 'model', label: t('tool.model'), rows: 1 },
      ]}
    />
  )
}
