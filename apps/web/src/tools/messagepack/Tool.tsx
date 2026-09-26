import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { MessagePackInput, MessagePackOptions } from './schema'

const EXAMPLE: MessagePackInput = {
  text: '{\n  "name": "工具库",\n  "count": 870,\n  "local": true,\n  "tags": ["json", "binary"]\n}',
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<MessagePackOptions>[] = [
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['encode', 'decode'] },
    { key: 'format', label: t('option.format'), kind: 'select', values: ['hex', 'base64'] },
  ]

  return (
    <TwoColumn<MessagePackInput, MessagePackOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 'encode', format: 'hex' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
