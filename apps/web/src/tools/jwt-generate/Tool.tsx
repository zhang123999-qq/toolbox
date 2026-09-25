import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { JwtGenerateInput, JwtGenerateOptions } from './schema'

/** 示例：payload 不含时间声明，配合示例密钥可复现出固定令牌 */
const EXAMPLE: JwtGenerateInput = {
  text: '{"sub":"1234567890","name":"工具库 Toolbox","role":"admin"}',
  secret: 'demo-secret-1234567890-demo-secret',
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<JwtGenerateOptions>[] = [
    {
      key: 'algorithm',
      label: t('option.algorithm'),
      kind: 'select',
      values: ['HS256', 'HS384', 'HS512'],
    },
  ]

  return (
    <TwoColumn<JwtGenerateInput, JwtGenerateOptions>
      meta={meta}
      initialInput={{ text: '', secret: '' }}
      initialOptions={{ algorithm: 'HS256' }}
      runAsync={transform}
      idleText={'填好 payload 与密钥后点「运行」'}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[{ key: 'secret', label: t('option.secret'), rows: 1 }]}
    />
  )
}
