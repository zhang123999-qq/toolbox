import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { SshKeyInput, SshKeyOptions } from './schema'

/** 输入框内容会作为公钥注释，示例给一个固定占位符，点「示例」→「运行」即可产出 */
const EXAMPLE: SshKeyInput = { text: 'generate' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<SshKeyOptions>[] = [
    {
      key: 'algorithm',
      label: t('option.algorithm'),
      kind: 'select',
      values: ['ed25519', 'rsa'],
    },
    { key: 'bits', label: t('option.bits'), kind: 'select', values: ['2048', '3072', '4096'] },
  ]

  return (
    <TwoColumn<SshKeyInput, SshKeyOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ algorithm: 'ed25519', bits: '2048' }}
      runAsync={transform}
      idleText={'在输入框填一个注释（点「示例」也行），再点「运行」生成密钥对'}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
