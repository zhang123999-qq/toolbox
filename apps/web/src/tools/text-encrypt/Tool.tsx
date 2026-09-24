import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { TextEncryptInput, TextEncryptOptions } from './schema'

const EXAMPLE: TextEncryptInput = { text: '这是一段需要加密的明文。', password: '' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<TextEncryptOptions>[] = [
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['encrypt', 'decrypt'] },
  ]

  return (
    <TwoColumn<TextEncryptInput, TextEncryptOptions>
      meta={meta}
      initialInput={{ text: '', password: '' }}
      initialOptions={{ mode: 'encrypt' }}
      runAsync={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[{ key: 'password', label: t('tool.password'), rows: 1 }]}
    />
  )
}
