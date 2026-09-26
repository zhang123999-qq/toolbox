import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { ProtobufCodecInput, ProtobufCodecOptions } from './schema'

const EXAMPLE: ProtobufCodecInput = {
  text: [
    'syntax = "proto3";',
    '',
    'message User {',
    '  int32 id = 1;',
    '  string name = 2;',
    '  sint32 score = 3;',
    '}',
  ].join('\n'),
  values: '{\n  "id": 1,\n  "name": "abc",\n  "score": -3\n}',
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<ProtobufCodecOptions>[] = [
    {
      key: 'mode',
      label: t('option.mode'),
      kind: 'select',
      values: ['structure', 'encode', 'decode'],
    },
    { key: 'target', label: t('option.target'), kind: 'text', placeholder: '留空取第一个' },
    { key: 'format', label: t('option.format'), kind: 'select', values: ['hex', 'base64'] },
  ]

  return (
    <TwoColumn<ProtobufCodecInput, ProtobufCodecOptions>
      meta={meta}
      initialInput={{ text: '', values: '' }}
      initialOptions={{ mode: 'structure', target: '', format: 'hex' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[{ key: 'values', label: t('tool.otherText') }]}
    />
  )
}
