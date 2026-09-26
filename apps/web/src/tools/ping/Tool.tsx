import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { PingInput, PingOptions } from './schema'

export default function Tool() {
  // 这些选项名 i18n 词典里没有现成 key，直接用中文字面量（README 有完整说明）
  const optionDefs: readonly OptionDef<PingOptions>[] = [
    { key: 'count', label: '发包数', kind: 'text', placeholder: '4' },
    { key: 'interval', label: '间隔(秒)', kind: 'text', placeholder: '1' },
    { key: 'packetSize', label: '包大小(字节)', kind: 'text', placeholder: '64' },
    { key: 'platform', label: '平台', kind: 'select', values: ['windows', 'linux', 'macos'] },
    { key: 'httpCheck', label: 'HTTP 弱检测', kind: 'boolean' },
  ]

  return (
    <TwoColumn<PingInput, PingOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        count: '4',
        interval: '1',
        packetSize: '64',
        platform: 'windows',
        httpCheck: false,
      }}
      runAsync={transform}
      idleText="输入目标主机后点「运行」，生成跨平台 ping 命令（浏览器不发送 ICMP）"
      example={{ text: 'example.com' }}
      optionDefs={optionDefs}
    />
  )
}
