import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { AnsibleConfigInput, AnsibleConfigOptions } from './schema'

const EXAMPLE: AnsibleConfigInput = { text: 'generate' }

export default function Tool() {
  const optionDefs: readonly OptionDef<AnsibleConfigOptions>[] = [
    { key: 'hosts', label: '主机组', kind: 'text', placeholder: 'webservers' },
    { key: 'taskName', label: 'Play 名称', kind: 'text', placeholder: 'configure servers' },
    { key: 'become', label: 'sudo 提权', kind: 'boolean' },
    { key: 'installPackage', label: '安装软件包', kind: 'boolean' },
    { key: 'copyFile', label: '复制配置文件', kind: 'boolean' },
    { key: 'startService', label: '启动服务', kind: 'boolean' },
    { key: 'manageUser', label: '管理用户', kind: 'boolean' },
  ]
  return (
    <TwoColumn<AnsibleConfigInput, AnsibleConfigOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        hosts: '',
        taskName: '',
        become: true,
        installPackage: true,
        copyFile: false,
        startService: false,
        manageUser: false,
      }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
