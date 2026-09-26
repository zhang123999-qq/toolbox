import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { DnsQueryInput, DnsQueryOptions } from './schema'

const EXAMPLE: DnsQueryInput = { text: 'example.com' }

export default function Tool() {
  const optionDefs: readonly OptionDef<DnsQueryOptions>[] = [
    {
      key: 'type',
      label: '记录类型',
      kind: 'select',
      values: ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS'],
    },
  ]

  return (
    <TwoColumn<DnsQueryInput, DnsQueryOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ type: 'A' }}
      runAsync={transform}
      idleText="输入域名后点「运行」，通过 Google DoH（dns.google）在浏览器内直接查询"
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
