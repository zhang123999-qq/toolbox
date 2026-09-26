import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { PortScanInput, PortScanOptions } from './schema'

/** 输入即目标主机：点「示例」填一个公网示例主机 */
const EXAMPLE: PortScanInput = { text: 'example.com' }

export default function Tool() {
  // 这些选项名 i18n 词典里没有现成 key，直接用中文字面量（README 有完整说明）
  const optionDefs: readonly OptionDef<PortScanOptions>[] = [
    { key: 'ports', label: '端口范围', kind: 'text', placeholder: '1-1000 或 22,80,443' },
    { key: 'scanType', label: '扫描类型', kind: 'select', values: ['connect', 'syn', 'udp'] },
    { key: 'speed', label: '速度', kind: 'select', values: ['slow', 'normal', 'fast'] },
  ]

  return (
    <TwoColumn<PortScanInput, PortScanOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        ports: '1-1000',
        scanType: 'connect',
        speed: 'normal',
      }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
