import { describe, expect, it } from 'vitest'
import { SqlToOrmError, parseTables, transform } from './utils'
import type { SqlToOrmOptions } from './schema'

const DDL = `CREATE TABLE \`users\` (
  \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  \`name\` VARCHAR(100) NOT NULL,
  \`email\` VARCHAR(255) UNIQUE,
  \`age\` INT,
  \`active\` TINYINT(1) NOT NULL DEFAULT 1,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);`

const seq: SqlToOrmOptions = { target: 'sequelize' }
const orm: SqlToOrmOptions = { target: 'typeorm' }

describe('sql-to-orm / parseTables', () => {
  it('解析表名、列与约束', () => {
    const [table] = parseTables(DDL)
    expect(table.name).toBe('users')
    expect(table.columns.map((c) => c.name)).toEqual([
      'id',
      'name',
      'email',
      'age',
      'active',
      'created_at',
    ])
    const id = table.columns[0]
    expect(id.primaryKey).toBe(true)
    expect(id.autoIncrement).toBe(true)
    expect(id.nullable).toBe(false)
    expect(table.columns[1].length).toBe(100)
    expect(table.columns[2].unique).toBe(true)
    expect(table.columns[3].nullable).toBe(true)
    expect(table.columns[4].defaultValue).toBe('1')
  })

  it('表级 PRIMARY KEY 标记到对应列', () => {
    const tables = parseTables('CREATE TABLE t (a INT, b INT, PRIMARY KEY (a, b));')
    expect(tables[0].columns.map((c) => c.primaryKey)).toEqual([true, true])
  })

  it('解析多张表', () => {
    const tables = parseTables(
      'CREATE TABLE a (id INT PRIMARY KEY); CREATE TABLE b (id INT PRIMARY KEY);',
    )
    expect(tables.map((t) => t.name)).toEqual(['a', 'b'])
  })
})

describe('sql-to-orm / transform · sequelize', () => {
  it('生成 define 与类型 / 约束', () => {
    const out = transform({ text: DDL }, seq)
    expect(out).toContain("sequelize.define('users'")
    expect(out).toContain('type: DataTypes.INTEGER')
    expect(out).toContain('primaryKey: true')
    expect(out).toContain('autoIncrement: true')
    expect(out).toContain('allowNull: false')
    expect(out).toContain('DataTypes.STRING(100)')
    expect(out).toContain('unique: true')
    expect(out).toContain('default: 1')
    expect(out).toContain('default: DataTypes.NOW')
    expect(out).toContain("tableName: 'users'")
  })

  it('模型名单数化并转 PascalCase', () => {
    expect(transform({ text: 'CREATE TABLE user_posts (id INT);' }, seq)).toContain(
      'const UserPost = sequelize.define',
    )
  })
})

describe('sql-to-orm / transform · typeorm', () => {
  it('生成 @Entity 与装饰器列', () => {
    const out = transform({ text: DDL }, orm)
    expect(out).toContain("@Entity('users')")
    expect(out).toContain('export class User')
    expect(out).toContain('@PrimaryGeneratedColumn()')
    expect(out).toContain("name: 'name', type: 'varchar', length: 100")
    expect(out).toContain('createdAt?: Date')
    expect(out).toContain('age?: number')
  })

  it('非自增主键用 @PrimaryColumn', () => {
    expect(transform({ text: 'CREATE TABLE t (code CHAR(3) PRIMARY KEY);' }, orm)).toContain(
      "@PrimaryColumn({ name: 'code', type: 'char' })",
    )
  })
})

describe('sql-to-orm / 边界与异常', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, seq)).toBe('')
  })

  it('没有 CREATE TABLE 抛错', () => {
    expect(() => transform({ text: 'SELECT 1;' }, seq)).toThrow(SqlToOrmError)
  })

  it('超长抛错', () => {
    expect(() =>
      transform({ text: `CREATE TABLE t (x VARCHAR(${'1'.repeat(200_000)}));` }, seq),
    ).toThrow(SqlToOrmError)
  })

  it('忽略 -- 与块注释', () => {
    const sql = '-- header\nCREATE TABLE /* x */ t (id INT); -- tail'
    expect(parseTables(sql)).toHaveLength(1)
  })
})
