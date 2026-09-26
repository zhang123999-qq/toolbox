import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { BsonCodecInput, BsonCodecOptions } from './schema'

const EXAMPLE: BsonCodecInput = {
  text: [
    '{',
    '  "_id": { "$oid": "507f1f77bcf86cd799439011" },',
    '  "name": "工具库",',
    '  "count": 870,',
    '  "ratio": 1.5,',
    '  "active": true,',
    '  "createdAt": { "$date": 1700000000000 }',
    '}',
  ].join('\n'),
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<BsonCodecOptions>[] = [
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['encode', 'decode'] },
    { key: 'format', label: t('option.format'), kind: 'select', values: ['hex', 'base64'] },
  ]

  return (
    <TwoColumn<BsonCodecInput, BsonCodecOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 'encode', format: 'hex' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
