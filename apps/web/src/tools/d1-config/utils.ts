/**
 * d1-config（#808）核心逻辑：D1 配置校验、wrangler.toml 片段生成与建表示例 SQL。
 * 纯函数，无 DOM / 网络依赖，可在 Node 下单测。
 */

export interface D1Options {
  databaseName: string
  databaseId: string
  binding: string
  migrationsDir?: string
}

const BINDING_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/
const DATABASE_ID_RE = /^[0-9a-f-]{36}$/i
const TABLE_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/

/** 绑定名须为合法 JS 标识符（Worker 代码中以 env.<binding> 访问） */
export function validateD1Binding(binding: string): void {
  if (binding.trim() === '') throw new Error('绑定名不能为空')
  if (!BINDING_RE.test(binding)) {
    throw new Error('绑定名须为合法 JS 标识符（字母 / _ / $ 开头，后接字母、数字、_、$）')
  }
}

/** D1 数据库 ID 为 UUID 格式（wrangler d1 create 输出） */
export function validateD1DatabaseId(id: string): void {
  if (id.trim() === '') throw new Error('数据库 ID 不能为空')
  if (!DATABASE_ID_RE.test(id.trim())) {
    throw new Error('数据库 ID 应为 UUID 格式（如 00000000-0000-4000-8000-000000000000）')
  }
}

/** 生成 wrangler.toml 的 [[d1_databases]] 片段 */
export function buildD1Config(opts: D1Options): string {
  const name = opts.databaseName.trim()
  if (name === '') throw new Error('数据库名称不能为空')
  validateD1Binding(opts.binding)
  validateD1DatabaseId(opts.databaseId)
  const lines = [
    '[[d1_databases]]',
    `binding = "${opts.binding}"`,
    `database_name = "${name}"`,
    `database_id = "${opts.databaseId.trim()}"`,
  ]
  const dir = (opts.migrationsDir ?? '').trim()
  if (dir !== '') {
    if (dir.includes('..')) throw new Error('迁移目录不能包含 ..')
    lines.push(`migrations_dir = "${dir}"`)
  }
  return lines.join('\n') + '\n'
}

/** 生成示例建表 SQL（表名需为合法标识符） */
export function generateD1SchemaExample(tableName: string): string {
  const table = tableName.trim()
  if (table === '') throw new Error('表名不能为空')
  if (!TABLE_NAME_RE.test(table)) {
    throw new Error('表名须为合法标识符（字母 / 下划线开头，后接字母、数字、下划线）')
  }
  return [
    `-- 示例建表 SQL：保存为 migrations/0001_init.sql`,
    `CREATE TABLE ${table} (`,
    '  id INTEGER PRIMARY KEY AUTOINCREMENT,',
    '  created_at TEXT NOT NULL DEFAULT (datetime(\'now\')),',
    "  name TEXT NOT NULL",
    ');',
  ].join('\n') + '\n'
}

export const EXAMPLE_D1_ID = '00000000-0000-4000-8000-000000000000'
