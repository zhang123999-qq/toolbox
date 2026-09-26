import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { SshConfigInput, SshConfigOptions } from './schema'

const EXAMPLE: SshConfigInput = { text: 'generate' }

export default function Tool() {
  const optionDefs: readonly OptionDef<SshConfigOptions>[] = [
    { key: 'host', label: '主机别名（Host）', kind: 'text', placeholder: 'myserver' },
    { key: 'hostname', label: '真实主机名（HostName）', kind: 'text', placeholder: '1.2.3.4' },
    { key: 'port', label: '端口（Port）', kind: 'text', placeholder: '22' },
    { key: 'user', label: '登录用户（User）', kind: 'text', placeholder: 'root' },
    {
      key: 'identityFile',
      label: '私钥路径（IdentityFile）',
      kind: 'text',
      placeholder: '~/.ssh/id_ed25519',
    },
    { key: 'proxyJump', label: '跳板机（ProxyJump）', kind: 'text', placeholder: 'bastion' },
    { key: 'forwardAgent', label: 'ForwardAgent', kind: 'boolean' },
  ]

  return (
    <TwoColumn<SshConfigInput, SshConfigOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        host: 'myserver',
        hostname: '',
        port: '',
        user: '',
        identityFile: '',
        proxyJump: '',
        forwardAgent: false,
      }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
