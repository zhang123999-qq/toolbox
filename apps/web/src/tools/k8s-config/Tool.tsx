import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { K8sConfigInput, K8sConfigOptions } from './schema'
import { KINDS } from './schema'

const EXAMPLE: K8sConfigInput = { text: 'generate' }

export default function Tool() {
  const optionDefs: readonly OptionDef<K8sConfigOptions>[] = [
    { key: 'kind', label: '资源类型', kind: 'select', values: [...KINDS] },
    { key: 'name', label: '名称', kind: 'text', placeholder: 'app' },
    { key: 'image', label: '镜像', kind: 'text', placeholder: 'nginx:alpine' },
    { key: 'port', label: '端口', kind: 'text', placeholder: '80' },
    { key: 'replicas', label: '副本数', kind: 'text', placeholder: '1' },
  ]
  return (
    <TwoColumn<K8sConfigInput, K8sConfigOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ kind: 'Deployment', name: '', image: '', port: '', replicas: '' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
