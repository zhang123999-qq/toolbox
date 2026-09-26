import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { DockerComposeInput, DockerComposeOptions } from './schema'

const EXAMPLE: DockerComposeInput = { text: 'generate' }

export default function Tool() {
  const optionDefs: readonly OptionDef<DockerComposeOptions>[] = [
    { key: 'serviceName', label: '服务名', kind: 'text', placeholder: 'web' },
    { key: 'image', label: '镜像', kind: 'text', placeholder: 'nginx:alpine' },
    { key: 'ports', label: '端口映射', kind: 'text', placeholder: '3000:80' },
    { key: 'environment', label: '环境变量', kind: 'textarea', placeholder: 'DEBUG=true' },
    { key: 'volumes', label: '卷挂载', kind: 'text', placeholder: './data:/data' },
    { key: 'dependsOn', label: '依赖服务', kind: 'text', placeholder: 'db' },
  ]
  return (
    <TwoColumn<DockerComposeInput, DockerComposeOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        serviceName: '',
        image: '',
        ports: '',
        environment: '',
        volumes: '',
        dependsOn: '',
      }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
