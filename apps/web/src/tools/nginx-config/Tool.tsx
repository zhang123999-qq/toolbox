import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { NginxConfigInput, NginxConfigOptions } from './schema'

const EXAMPLE: NginxConfigInput = { text: 'generate' }

export default function Tool() {
  const optionDefs: readonly OptionDef<NginxConfigOptions>[] = [
    { key: 'serverName', label: '域名', kind: 'text', placeholder: 'example.com' },
    { key: 'listen', label: '监听端口', kind: 'text', placeholder: '80' },
    { key: 'root', label: '站点根目录', kind: 'text', placeholder: '/usr/share/nginx/html' },
    { key: 'proxyPass', label: '反向代理到', kind: 'text', placeholder: 'http://127.0.0.1:3000' },
    { key: 'ssl', label: '启用 SSL', kind: 'boolean' },
    { key: 'gzip', label: '启用 gzip', kind: 'boolean' },
  ]
  return (
    <TwoColumn<NginxConfigInput, NginxConfigOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        serverName: '',
        listen: '',
        root: '',
        proxyPass: '',
        ssl: false,
        gzip: false,
      }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
