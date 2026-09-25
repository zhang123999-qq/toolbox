import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { ScryptInput, ScryptOptions } from './schema'

/** 示例：password / NaCl 是 RFC 7914 向量的输入；默认 N=1024 只要几十毫秒 */
const EXAMPLE: ScryptInput = { text: 'password', salt: 'NaCl' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<ScryptOptions>[] = [
    {
      key: 'blocks',
      label: t('option.blocks'),
      kind: 'select',
      values: ['1024', '16384', '65536'],
    },
    {
      key: 'parallelism',
      label: t('option.parallelism'),
      kind: 'select',
      values: ['1', '2', '4'],
    },
    { key: 'length', label: t('option.length'), kind: 'select', values: ['32', '64'] },
    { key: 'format', label: t('option.format'), kind: 'select', values: ['hex', 'base64'] },
  ]

  return (
    <TwoColumn<ScryptInput, ScryptOptions>
      meta={meta}
      initialInput={{ text: '', salt: '' }}
      initialOptions={{ blocks: '1024', parallelism: '1', length: '32', format: 'hex' }}
      runAsync={transform}
      idleText={'填好口令与盐后点「运行」，Scrypt 较慢请稍候'}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[{ key: 'salt', label: t('option.salt'), rows: 1 }]}
    />
  )
}
