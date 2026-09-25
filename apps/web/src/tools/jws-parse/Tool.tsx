import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { JwsParseInput, JwsParseOptions } from './schema'

/** 示例：用演示密钥签出的令牌（不含时间声明，结论与当前时间无关） */
const EXAMPLE: JwsParseInput = {
  text: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IuW3peWFt-W6kyBUb29sYm94Iiwicm9sZSI6ImFkbWluIn0.ZBhZL0i-YX8INfmGx5HLpPl62RGIhBfCkhK-ymqzmuA',
  secret: 'demo-secret-1234567890-demo-secret',
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<JwsParseOptions>[] = [
    {
      key: 'algorithm',
      label: t('option.algorithm'),
      kind: 'select',
      values: ['HS256', 'HS384', 'HS512'],
    },
  ]

  return (
    <TwoColumn<JwsParseInput, JwsParseOptions>
      meta={meta}
      initialInput={{ text: '', secret: '' }}
      initialOptions={{ algorithm: 'HS256' }}
      runAsync={transform}
      idleText={'填好令牌与密钥后点「运行」'}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[{ key: 'secret', label: t('option.secret'), rows: 1 }]}
    />
  )
}
