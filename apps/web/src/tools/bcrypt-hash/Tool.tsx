import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { BcryptInput, BcryptOptions } from './schema'

/** 示例：哈希方向只需一段口令；校验方向请在「待校验哈希」里粘贴 $2b$… 串 */
const EXAMPLE: BcryptInput = { text: 'P@ssw0rd-demo', hash: '' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<BcryptOptions>[] = [
    {
      key: 'direction',
      label: t('option.direction'),
      kind: 'select',
      values: ['hash', 'verify'],
    },
    { key: 'cost', label: t('option.cost'), kind: 'select', values: ['4', '6', '8', '10', '12'] },
  ]

  return (
    <TwoColumn<BcryptInput, BcryptOptions>
      meta={meta}
      initialInput={{ text: '', hash: '' }}
      initialOptions={{ direction: 'hash', cost: '8' }}
      runAsync={transform}
      idleText={'填好口令后点「运行」（bcrypt 较慢，cost 越大越慢）'}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[{ key: 'hash', label: t('option.hash'), rows: 1 }]}
    />
  )
}
