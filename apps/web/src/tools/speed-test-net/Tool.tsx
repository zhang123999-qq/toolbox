import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { SpeedTestNetInput, SpeedTestNetOptions } from './schema'

const EXAMPLE: SpeedTestNetInput = { text: 'https://example.com' }

export default function Tool() {
  const optionDefs: readonly OptionDef<SpeedTestNetOptions>[] = [
    {
      key: 'mode',
      label: '测速模式',
      kind: 'select',
      values: ['download', 'upload', 'both'],
    },
    { key: 'uploadKb', label: '上传数据量（KB）', kind: 'text' },
  ]

  return (
    <TwoColumn<SpeedTestNetInput, SpeedTestNetOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 'both', uploadKb: '256' }}
      runAsync={transform}
      idleText="输入测速端点 URL 后点「运行」，在浏览器内测量下载/上传带宽（Mbps）。跨域端点可能被 CORS 拦截，请使用允许跨域的测速端点。"
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
