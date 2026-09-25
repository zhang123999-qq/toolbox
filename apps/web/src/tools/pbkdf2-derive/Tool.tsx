import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { Pbkdf2Input, Pbkdf2Options } from './schema'

/** 示例：口令 password / 盐 salt，是 PBKDF2 标准向量的输入 */
const EXAMPLE: Pbkdf2Input = { text: 'password', salt: 'salt' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<Pbkdf2Options>[] = [
    {
      key: 'algorithm',
      label: t('option.algorithm'),
      kind: 'select',
      values: ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'],
    },
    {
      key: 'iterations',
      label: t('option.iterations'),
      kind: 'select',
      values: ['1000', '10000', '100000', '600000'],
    },
    { key: 'length', label: t('option.length'), kind: 'select', values: ['16', '32', '64'] },
    { key: 'encoding', label: t('option.encoding'), kind: 'select', values: ['utf8', 'hex'] },
    { key: 'format', label: t('option.format'), kind: 'select', values: ['hex', 'base64'] },
  ]

  return (
    <TwoColumn<Pbkdf2Input, Pbkdf2Options>
      meta={meta}
      initialInput={{ text: '', salt: '' }}
      initialOptions={{
        algorithm: 'SHA-256',
        iterations: '100000',
        length: '32',
        encoding: 'utf8',
        format: 'hex',
      }}
      runAsync={transform}
      idleText={'填好口令与盐后点「运行」，派生结果出现在这里'}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[{ key: 'salt', label: t('option.salt'), rows: 1 }]}
    />
  )
}
