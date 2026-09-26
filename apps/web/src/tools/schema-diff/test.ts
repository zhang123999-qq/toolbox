import { describe, expect, it } from 'vitest'
import { SchemaDiffError, diffSchemas, parseSchema, parseSqlSchema, transform } from './utils'
import type { SchemaDiffInput, SchemaDiffOptions } from './schema'

const report: SchemaDiffOptions = { format: 'report', ignoreCase: true }
const noCaseFold: SchemaDiffOptions = { format: 'report', ignoreCase: false }

const OLD_SQL = [
  'CREATE TABLE users (',
  '  id BIGINT PRIMARY KEY AUTO_INCREMENT,',
  '  email VARCHAR(100) NOT NULL UNIQUE,',
  '  created_at DATETIME',
  ');',
].join('\n')

const NEW_SQL = [
  'CREATE TABLE users (',
  '  id BIGINT PRIMARY KEY AUTO_INCREMENT,',
  '  email VARCHAR(255) NOT NULL UNIQUE,',
  '  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
  ');',
  'CREATE TABLE logs (',
  '  id BIGINT PRIMARY KEY,',
  '  message TEXT',
  ');',
].join('\n')

const OLD_JSON = JSON.stringify(
  {
    users: {
      id: { type: 'bigint', primaryKey: true },
      name: { type: 'varchar(50)', nullable: false },
      age: { type: 'int' },
    },
  },
  null,
  2,
)

const NEW_JSON = JSON.stringify(
  {
    users: {
      id: { type: 'bigint', primaryKey: true },
      name: { type: 'varchar(80)', nullable: false },
    },
  },
  null,
  2,
)

describe('schema-diff / transform', () => {
  it('对比两份建表语句：类型拓宽、约束收紧、整表新增', () => {
    const input: SchemaDiffInput = { text: OLD_SQL, schemaB: NEW_SQL }
    const out = transform(input, report)
    expect(out).toContain('新增表 1 · 删除表 0 · 新增字段 0 · 删除字段 0 · 字段变更 3')
    expect(out).toContain('~ users.email  类型: varchar(100) → varchar(255)')
    expect(out).toContain('~ users.created_at  可空: （空） → false')
    expect(out).toContain('+ logs')
  })

  it('对比两份 JSON Schema：字段删除与类型变更', () => {
    const out = transform({ text: OLD_JSON, schemaB: NEW_JSON }, report)
    expect(out).toContain('删除字段 1')
    expect(out).toContain('- users.age')
    expect(out).toContain('~ users.name  类型: varchar(50) → varchar(80)')
  })

  it('两份一致时明确说明一致（边界）', () => {
    expect(transform({ text: OLD_SQL, schemaB: OLD_SQL }, report)).toContain('完全一致')
  })

  it('ignoreCase 关闭时 INT 与 int 算作类型变更', () => {
    const before = '{"t":{"a":{"type":"INT"}}}'
    const after = '{"t":{"a":{"type":"int"}}}'
    expect(transform({ text: before, schemaB: after }, report)).toContain('完全一致')
    expect(transform({ text: before, schemaB: after }, noCaseFold)).toContain('字段变更 1')
  })

  it('ignoreCase 只影响类型，不影响默认值等区分大小写的属性', () => {
    const before = '{"t":{"a":{"type":"varchar","default":"ABC"}}}'
    const after = '{"t":{"a":{"type":"varchar","default":"abc"}}}'
    expect(transform({ text: before, schemaB: after }, report)).toContain('默认值: ABC → abc')
  })

  it('一侧为空时视为整表新增 / 整表删除（边界）', () => {
    const added = transform({ text: '', schemaB: OLD_JSON }, report)
    expect(added).toContain('新增表 1')
    const removed = transform({ text: OLD_JSON, schemaB: '' }, report)
    expect(removed).toContain('删除表 1')
  })

  it('两侧都为空返回空字符串（边界）', () => {
    expect(transform({ text: '', schemaB: '' }, report)).toBe('')
    expect(transform({ text: '  \n ', schemaB: '\t' }, report)).toBe('')
  })

  it('表级 PRIMARY KEY 回填到列上，并参与对比', () => {
    const before = 'CREATE TABLE t (id BIGINT, PRIMARY KEY (id));'
    const after = 'CREATE TABLE t (id BIGINT);'
    const out = transform({ text: before, schemaB: after }, report)
    expect(out).toContain('主键: true → （空）')
    expect(parseSqlSchema(before)[0]?.fields[0]?.primaryKey).toBe('true')
  })

  it('JSON Schema 的 properties / required 形态也能解析', () => {
    const before =
      '{"title":"user","properties":{"id":{"type":"integer"},"age":{"type":"integer"}},"required":["id"]}'
    const after = '{"title":"user","properties":{"id":{"type":"string"},"age":{"type":"integer"}}}'
    const out = transform({ text: before, schemaB: after }, report)
    expect(out).toContain('~ user.id  类型: integer → string')
    // required 里的字段被判为不可空，移除 required 后应出现「可空 false → 空」
    expect(out).toContain('~ user.id  可空: false → （空）')
  })

  it('列定义写成类型字符串时按 SQL 语法解释约束', () => {
    const before = '{"t":{"a":"varchar(10) not null"}}'
    const after = '{"t":{"a":"varchar(10)"}}'
    expect(transform({ text: before, schemaB: after }, report)).toContain('可空: false → （空）')
  })

  it('非法 JSON 抛 SchemaDiffError（异常）', () => {
    expect(() => transform({ text: '{oops', schemaB: '{}' }, report)).toThrow(SchemaDiffError)
  })

  it('两侧格式不一致 / SQL 里没有 CREATE TABLE 都抛错（异常）', () => {
    expect(() => transform({ text: OLD_SQL, schemaB: NEW_JSON }, report)).toThrow(SchemaDiffError)
    expect(() => transform({ text: 'SELECT 1 FROM t', schemaB: OLD_SQL }, report)).toThrow(
      SchemaDiffError,
    )
  })

  it('缺少 type 的字段给出明确报错（异常）', () => {
    expect(() =>
      transform({ text: '{"t":{"a":{"nullable":false}}}', schemaB: '' }, report),
    ).toThrow(SchemaDiffError)
  })

  it('超长输入抛出中文上限提示（边界）', () => {
    expect(() => transform({ text: 'a'.repeat(100_001), schemaB: '' }, report)).toThrow(
      SchemaDiffError,
    )
  })

  it('JSON 输出可被 JSON.parse 还原', () => {
    const parsed = JSON.parse(
      transform({ text: OLD_JSON, schemaB: NEW_JSON }, { format: 'json', ignoreCase: true }),
    ) as { removedFields: { field: string }[]; changes: { property: string }[] }
    expect(parsed.removedFields[0]?.field).toBe('users.age')
    expect(parsed.changes[0]?.property).toBe('type')
  })

  it('Markdown 输出带表格表头与变更行', () => {
    const out = transform(
      { text: OLD_JSON, schemaB: NEW_JSON },
      { format: 'markdown', ignoreCase: true },
    )
    expect(out).toContain('| 字段 | 类型 |')
    expect(out).toContain('| users.name | 类型 | varchar(50) | varchar(80) |')
  })

  it('diffSchemas 直接可用，便于按.FieldPath 断言', () => {
    const diff = diffSchemas(parseSchema(OLD_JSON), parseSchema(NEW_JSON), report)
    expect(diff.changes.map((change) => `${change.field}.${change.prop}`)).toEqual(['name.type'])
  })
})
