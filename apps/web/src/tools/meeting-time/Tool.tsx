import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { ExtraInputDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { MeetingTimeInput, MeetingTimeOptions } from './schema'

/** 示例：北京时间周一下午，纽约 / 伦敦参会 */
const EXAMPLE: MeetingTimeInput = {
  text: '2026-09-28 14:00',
  sourceZone: 'Asia/Shanghai',
  zones: 'America/New_York\nEurope/London',
}

export default function Tool() {
  const extraInputs: readonly ExtraInputDef[] = [
    { key: 'sourceZone', label: '源时区（IANA 名）', rows: 1 },
    { key: 'zones', label: '参与方时区（每行一个）', rows: 4 },
  ]

  return (
    <TwoColumn<MeetingTimeInput, MeetingTimeOptions>
      meta={meta}
      initialInput={{ text: '', sourceZone: 'Asia/Shanghai', zones: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
      extraInputs={extraInputs}
    />
  )
}
