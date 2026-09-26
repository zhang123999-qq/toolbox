import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { EnvInput, EnvOptions } from './schema'

const EXAMPLE: EnvInput = {
  text: [
    '# 应用配置',
    'export APP_PORT=3000',
    'DB_HOST="localhost"',
    "DB_PASS='s3cret'",
    'DEBUG=true',
    '',
  ].join('\n'),
}

export default function Tool() {
  const optionDefs: readonly OptionDef<EnvOptions>[] = [
    { key: 'keepComments', label: '保留注释', kind: 'boolean' },
  ]
  return (
    <TwoColumn<EnvInput, EnvOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ keepComments: false }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
