import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { HmacInput, HmacOptions } from './schema'

const EXAMPLE: HmacInput = { text: 'The quick brown fox jumps over the lazy dog', key: 'key' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<HmacOptions>[] = [
    {
      key: 'algorithm',
      label: t('option.algorithm'),
      kind: 'select',
      values: ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'],
    },
    { key: 'format', label: t('option.format'), kind: 'select', values: ['hex', 'base64'] },
    { key: 'type', label: t('option.type'), kind: 'select', values: ['text', 'hex'] },
  ]

  return (
    <TwoColumn<HmacInput, HmacOptions>
      meta={meta}
      initialInput={{ text: '', key: '' }}
      initialOptions={{ algorithm: 'SHA-256', format: 'hex', type: 'text' }}
      runAsync={transform}
      idleText={'填好密钥后点「运行」计算 HMAC'}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[{ key: 'key', label: t('option.key'), rows: 1 }]}
    />
  )
}
