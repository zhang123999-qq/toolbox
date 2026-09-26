import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { ConnectionParserInput, ConnectionParserOptions } from './schema'

const EXAMPLE: ConnectionParserInput = {
  text: 'postgresql://admin:s3cr3t@db.example.com:5432/app?sslmode=require&pool=10',
}

export default function Tool() {
  return (
    <TwoColumn<ConnectionParserInput, ConnectionParserOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
      idleText="粘贴一条 mysql/postgresql/mongodb/redis/sqlite 连接串，拆出各字段"
    />
  )
}
