import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { D1ConfigInput } from './schema'
import { buildD1Config, EXAMPLE_D1_ID, generateD1SchemaExample } from './utils'

function buildOutputs(input: D1ConfigInput): { toml: string; sql: string } {
  const toml = buildD1Config({
    databaseName: input.text,
    databaseId: input.databaseId,
    binding: input.binding.trim(),
    migrationsDir: input.migrationsDir,
  })
  const sql = generateD1SchemaExample(input.tableName)
  return { toml, sql }
}

export default function Tool() {
  return (
    <MultiPanel<D1ConfigInput, Record<string, never>>
      meta={meta}
      initialInput={{
        text: 'app-db',
        databaseId: EXAMPLE_D1_ID,
        binding: 'DB',
        migrationsDir: '',
        tableName: 'users',
      }}
      initialOptions={{}}
      example={{
        text: 'app-db',
        databaseId: EXAMPLE_D1_ID,
        binding: 'DB',
        migrationsDir: 'migrations',
        tableName: 'users',
      }}
      extraInputs={[
        { key: 'databaseId', label: '数据库 ID（UUID）', rows: 1 },
        { key: 'binding', label: '绑定名', rows: 1 },
        { key: 'migrationsDir', label: '迁移目录（可选）', rows: 1 },
        { key: 'tableName', label: '示例表名', rows: 1 },
      ]}
      renderOutput={(input) => {
        let toml = ''
        let sql = ''
        let error = ''
        try {
          ;({ toml, sql } = buildOutputs(input))
        } catch (err) {
          error = err instanceof Error ? err.message : '生成失败'
        }
        return (
          <div className="flex flex-col gap-3">
            {error !== '' && (
              <p data-testid="d1-error" className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
            {toml !== '' && (
              <>
                <pre data-testid="d1-toml" className="whitespace-pre-wrap font-mono text-xs">
                  {toml}
                </pre>
                <pre data-testid="d1-sql" className="whitespace-pre-wrap font-mono text-xs">
                  {sql}
                </pre>
              </>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              说明：将 TOML 片段追加到 wrangler.toml；数据库 ID 来自 `npx wrangler d1 create
              &lt;名称&gt;` 的输出；示例 SQL 保存为迁移文件后用 `wrangler d1 migrations apply`
              应用。
            </p>
          </div>
        )
      }}
      toText={(input) => {
        try {
          const { toml, sql } = buildOutputs(input)
          return toml + '\n' + sql
        } catch {
          return ''
        }
      }}
      downloadExt="toml"
    />
  )
}
