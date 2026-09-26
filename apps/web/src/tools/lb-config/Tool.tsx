import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { LbConfigInput, LbConfigOptions } from './schema'

const EXAMPLE: LbConfigInput = { text: 'generate' }

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<LbConfigOptions>[] = [
    { key: 'type', label: t('option.type'), kind: 'select', values: ['nginx', 'haproxy'] },
    {
      key: 'servers',
      label: '后端服务器(每行一个)',
      kind: 'textarea',
      placeholder: '10.0.0.1:8080\n10.0.0.2:8080',
    },
    {
      key: 'algorithm',
      label: '调度算法',
      kind: 'select',
      values: ['round_robin', 'least_conn', 'ip_hash'],
    },
    { key: 'healthCheck', label: '健康检查', kind: 'boolean' },
  ]

  return (
    <TwoColumn<LbConfigInput, LbConfigOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        type: 'nginx',
        servers: '10.0.0.1:8080\n10.0.0.2:8080',
        algorithm: 'round_robin',
        healthCheck: true,
      }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
