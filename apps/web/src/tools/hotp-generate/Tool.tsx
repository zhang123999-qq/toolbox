import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { HotpInput, HotpOptions } from './schema'

/** 示例：RFC 4226 的密钥 + 计数器 0，输出应与标准文档的 755224 一致 */
const EXAMPLE: HotpInput = { text: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', counter: '0' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<HotpOptions>[] = [
    { key: 'digits', label: t('option.digits'), kind: 'select', values: ['6', '8'] },
    {
      key: 'algorithm',
      label: t('option.algorithm'),
      kind: 'select',
      values: ['SHA1', 'SHA256', 'SHA512'],
    },
  ]

  return (
    <TwoColumn<HotpInput, HotpOptions>
      meta={meta}
      initialInput={{ text: '', counter: '0' }}
      initialOptions={{ digits: '6', algorithm: 'SHA1' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[{ key: 'counter', label: t('option.counter'), rows: 1 }]}
    />
  )
}
