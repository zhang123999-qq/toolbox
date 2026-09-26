import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { DbConnectionInput, DbConnectionOptions } from './schema'

const EXAMPLE: DbConnectionInput = { text: 'generate' }

export default function Tool() {
  const optionDefs: readonly OptionDef<DbConnectionOptions>[] = [
    {
      key: 'dbType',
      label: '数据库类型',
      kind: 'select',
      values: ['mysql', 'postgresql', 'mongodb', 'redis', 'sqlite'],
    },
    { key: 'host', label: 'Host', kind: 'text', placeholder: 'localhost' },
    { key: 'port', label: 'Port', kind: 'text', placeholder: '默认端口' },
    { key: 'user', label: '用户', kind: 'text', placeholder: 'root' },
    { key: 'password', label: '密码', kind: 'text', placeholder: '（可空）' },
    { key: 'dbname', label: '库名', kind: 'text', placeholder: 'app' },
  ]

  return (
    <TwoColumn<DbConnectionInput, DbConnectionOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        dbType: 'mysql',
        host: 'localhost',
        port: '',
        user: 'root',
        password: '',
        dbname: 'app',
      }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
