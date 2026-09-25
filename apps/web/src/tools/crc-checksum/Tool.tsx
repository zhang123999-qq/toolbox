import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { CrcInput, CrcOptions } from './schema'

const EXAMPLE: CrcInput = { text: '123456789' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<CrcOptions>[] = [
    {
      key: 'algorithm',
      label: t('option.algorithm'),
      kind: 'select',
      values: ['crc32', 'crc32c', 'crc16-modbus', 'crc16-ccitt'],
    },
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['hex', 'dec'] },
  ]

  return (
    <TwoColumn<CrcInput, CrcOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ algorithm: 'crc32', mode: 'hex' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
