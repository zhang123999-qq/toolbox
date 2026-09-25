import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { JwtDecodeInput, JwtDecodeOptions } from './schema'

/** 示例令牌：HS256，payload 里没有时间声明，故输出与当前时间无关（可复现） */
const EXAMPLE: JwtDecodeInput = {
  text: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IuW3peWFt-W6kyBUb29sYm94Iiwicm9sZSI6ImFkbWluIn0.ZBhZL0i-YX8INfmGx5HLpPl62RGIhBfCkhK-ymqzmuA',
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<JwtDecodeOptions>[] = [
    { key: 'format', label: t('option.format'), kind: 'select', values: ['pretty', 'compact'] },
  ]

  return (
    <TwoColumn<JwtDecodeInput, JwtDecodeOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ format: 'pretty' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
