import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { JsonToK8sInput, JsonToK8sOptions } from './schema'

const EXAMPLE: JsonToK8sInput = {
  text: JSON.stringify({
    apiVersion: 'v1',
    kind: 'Service',
    metadata: { name: 'web' },
    spec: { type: 'ClusterIP', ports: [{ port: 80, targetPort: 8080 }] },
  }),
}

export default function Tool() {
  return (
    <TwoColumn<JsonToK8sInput, JsonToK8sOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
