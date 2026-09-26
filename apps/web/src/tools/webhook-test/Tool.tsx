import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { ExtraInputDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { WebhookTestInput, WebhookTestOptions } from './schema'

const EXAMPLE: WebhookTestInput = {
  text: 'https://webhook.site/your-uuid-here',
  payload: '{"event":"test","message":"hello from toolbox"}',
}

const extraInputs: readonly ExtraInputDef[] = [{ key: 'payload', label: '请求体（JSON）', rows: 5 }]

export default function Tool() {
  return (
    <TwoColumn<WebhookTestInput, WebhookTestOptions>
      meta={meta}
      initialInput={{ text: '', payload: '' }}
      initialOptions={{}}
      runAsync={transform}
      idleText="粘贴 Webhook 地址与 JSON 载荷后点「运行」，向该地址发一条 POST"
      example={EXAMPLE}
      extraInputs={extraInputs}
    />
  )
}
