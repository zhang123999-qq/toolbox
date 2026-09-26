import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { SqlPlanInput, SqlPlanOptions } from './schema'

const EXAMPLE: SqlPlanInput = {
  text: "SELECT u.id, u.name, o.total\nFROM users u\nJOIN orders o ON u.id = o.user_id\nWHERE u.status = 1 AND o.created_at > '2026-01-01'\nORDER BY o.total DESC\nLIMIT 20",
}

export default function Tool() {
  return (
    <TwoColumn<SqlPlanInput, SqlPlanOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
      idleText="粘贴一条 SELECT 语句，估算其执行计划（Seq/Index Scan、Join、排序、成本）"
    />
  )
}
