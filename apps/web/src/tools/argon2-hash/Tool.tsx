import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { Argon2Input, Argon2Options } from './schema'

/** 示例：哈希方向只需一段口令；校验方向请在「待校验哈希」里粘贴 PHC 串 */
const EXAMPLE: Argon2Input = { text: 'P@ssw0rd-demo', hash: '' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<Argon2Options>[] = [
    {
      key: 'direction',
      label: t('option.direction'),
      kind: 'select',
      values: ['hash', 'verify'],
    },
    {
      key: 'iterations',
      label: t('option.iterations'),
      kind: 'select',
      values: ['1', '2', '3'],
    },
    {
      key: 'memory',
      label: t('option.memory'),
      kind: 'select',
      values: ['8192', '19456', '32768'],
    },
    { key: 'parallelism', label: t('option.parallelism'), kind: 'select', values: ['1', '2'] },
  ]

  return (
    <TwoColumn<Argon2Input, Argon2Options>
      meta={meta}
      initialInput={{ text: '', hash: '' }}
      initialOptions={{ direction: 'hash', iterations: '2', memory: '19456', parallelism: '1' }}
      runAsync={transform}
      idleText={'填好口令后点「运行」（首次会下载 Argon2 的 WASM，约 30 KB）'}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[{ key: 'hash', label: t('option.hash'), rows: 1 }]}
    />
  )
}
