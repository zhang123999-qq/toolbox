import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { SqlMinifyInput, SqlMinifyOptions } from './schema'

const EXAMPLE: SqlMinifyInput = {
  text: [
    '-- 查活跃用户',
    'SELECT u.id,',
    '       u.name,',
    '       COUNT(*) AS cnt',
    'FROM users u',
    'LEFT JOIN orders o ON o.user_id = u.id',
    "WHERE u.age > 18 AND u.status = 'active'",
    'GROUP BY u.id',
    'ORDER BY cnt DESC',
    'LIMIT 10',
  ].join('\n'),
}

export default function Tool() {
  // 本工具无选项，只需把输入、转换与示例交给 T2 模板
  return (
    <TwoColumn<SqlMinifyInput, SqlMinifyOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
