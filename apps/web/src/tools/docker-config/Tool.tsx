import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { DockerConfigInput, DockerConfigOptions } from './schema'
import { BASE_IMAGES } from './schema'

const EXAMPLE: DockerConfigInput = { text: 'generate' }

export default function Tool() {
  const optionDefs: readonly OptionDef<DockerConfigOptions>[] = [
    { key: 'baseImage', label: '基础镜像', kind: 'select', values: [...BASE_IMAGES] },
    { key: 'version', label: '版本', kind: 'text', placeholder: '20-alpine' },
    { key: 'workdir', label: '工作目录', kind: 'text', placeholder: '/app' },
    { key: 'port', label: '暴露端口', kind: 'text', placeholder: '3000' },
    { key: 'command', label: '启动命令', kind: 'text', placeholder: 'node server.js' },
  ]
  return (
    <TwoColumn<DockerConfigInput, DockerConfigOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        baseImage: 'node',
        version: '',
        workdir: '',
        port: '',
        command: '',
      }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
