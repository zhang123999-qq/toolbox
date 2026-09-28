/**
 * d1-config（#808）utils 单测：校验、TOML 片段与建表示例 SQL。
 */
import { describe, expect, it } from 'vitest'
import {
  buildD1Config,
  EXAMPLE_D1_ID,
  generateD1SchemaExample,
  validateD1Binding,
  validateD1DatabaseId,
} from './utils'

describe('validateD1Binding', () => {
  it('合法绑定名通过', () => {
    expect(() => validateD1Binding('DB')).not.toThrow()
  })
  it('空绑定名抛错', () => {
    expect(() => validateD1Binding('')).toThrow('绑定名不能为空')
  })
  it('非法标识符抛错', () => {
    expect(() => validateD1Binding('my-db')).toThrow('合法 JS 标识符')
  })
})

describe('validateD1DatabaseId', () => {
  it('UUID 通过', () => {
    expect(() => validateD1DatabaseId(EXAMPLE_D1_ID)).not.toThrow()
  })
  it('空 ID 抛错', () => {
    expect(() => validateD1DatabaseId('  ')).toThrow('数据库 ID 不能为空')
  })
  it('格式非法抛错', () => {
    expect(() => validateD1DatabaseId('not-a-uuid')).toThrow('UUID 格式')
  })
})

describe('buildD1Config', () => {
  it('生成基本片段', () => {
    const toml = buildD1Config({ databaseName: 'app-db', databaseId: EXAMPLE_D1_ID, binding: 'DB' })
    expect(toml).toContain('[[d1_databases]]')
    expect(toml).toContain('binding = "DB"')
    expect(toml).toContain('database_name = "app-db"')
    expect(toml).toContain(`database_id = "${EXAMPLE_D1_ID}"`)
    expect(toml).not.toContain('migrations_dir')
  })
  it('带迁移目录', () => {
    const toml = buildD1Config({
      databaseName: 'app-db',
      databaseId: EXAMPLE_D1_ID,
      binding: 'DB',
      migrationsDir: 'migrations',
    })
    expect(toml).toContain('migrations_dir = "migrations"')
  })
  it('迁移目录含 .. 抛错', () => {
    expect(() =>
      buildD1Config({
        databaseName: 'app-db',
        databaseId: EXAMPLE_D1_ID,
        binding: 'DB',
        migrationsDir: '../secret',
      }),
    ).toThrow('不能包含 ..')
  })
  it('空库名抛错', () => {
    expect(() =>
      buildD1Config({ databaseName: ' ', databaseId: EXAMPLE_D1_ID, binding: 'DB' }),
    ).toThrow('数据库名称不能为空')
  })
  it('绑定名非法抛错', () => {
    expect(() =>
      buildD1Config({ databaseName: 'app-db', databaseId: EXAMPLE_D1_ID, binding: 'my-db' }),
    ).toThrow('合法 JS 标识符')
  })
  it('ID 非法抛错', () => {
    expect(() => buildD1Config({ databaseName: 'app-db', databaseId: 'x', binding: 'DB' })).toThrow(
      'UUID 格式',
    )
  })
})

describe('generateD1SchemaExample', () => {
  it('生成建表 SQL', () => {
    const sql = generateD1SchemaExample('users')
    expect(sql).toContain('CREATE TABLE users (')
    expect(sql).toContain('id INTEGER PRIMARY KEY AUTOINCREMENT')
  })
  it('空表名抛错', () => {
    expect(() => generateD1SchemaExample('')).toThrow('表名不能为空')
  })
  it('非法表名抛错', () => {
    expect(() => generateD1SchemaExample('user-table')).toThrow('合法标识符')
  })
})
