import { describe, expect, it } from 'vitest'
import { entityId, extractRelations, renderMermaid, transform } from './utils'
import type { ErDiagramInput } from './schema'

const input = (text: string): ErDiagramInput => ({ text })

const DDL = `CREATE TABLE users (
  id BIGINT PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);
CREATE TABLE posts (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  CONSTRAINT fk FOREIGN KEY (user_id) REFERENCES users (id)
);
CREATE TABLE comments (
  id BIGINT PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES posts (id)
);`

describe('er-diagram / extractRelations', () => {
  it('识别表级 FOREIGN KEY 与列级 REFERENCES', () => {
    const rels = extractRelations(DDL)
    expect(rels).toContainEqual({
      table: 'posts',
      column: 'user_id',
      refTable: 'users',
      refColumn: 'id',
    })
    expect(rels).toContainEqual({
      table: 'comments',
      column: 'post_id',
      refTable: 'posts',
      refColumn: 'id',
    })
  })

  it('忽略注释里的 REFERENCES（边界）', () => {
    const sql = `CREATE TABLE a (id INT PRIMARY KEY); -- REFERENCES b
CREATE TABLE b (id INT PRIMARY KEY);`
    expect(extractRelations(sql)).toHaveLength(0)
  })
})

describe('er-diagram / entityId', () => {
  it('非法字符替换为下划线，数字开头加 t_ 前缀', () => {
    expect(entityId('user-order')).toBe('user_order')
    expect(entityId('1table')).toBe('t_1table')
    expect(entityId('users')).toBe('users')
  })
})

describe('er-diagram / renderMermaid', () => {
  it('输出 erDiagram 头、关系线与实体块', () => {
    const out = renderMermaid(DDL)
    expect(out.startsWith('erDiagram')).toBe(true)
    expect(out).toContain('users ||--o{ posts : "user_id"')
    expect(out).toContain('posts ||--o{ comments : "post_id"')
    expect(out).toContain('users {')
    expect(out).toContain('bigint id PK')
    expect(out).toContain('bigint user_id FK')
  })

  it('外键指向不存在的表时跳过该关系（边界）', () => {
    const out = renderMermaid('CREATE TABLE a (id INT PRIMARY KEY, b INT REFERENCES ghost(id));')
    expect(out).not.toContain('ghost')
  })

  it('无建表语句抛错', () => {
    expect(() => renderMermaid('SELECT 1')).toThrow()
  })
})

describe('er-diagram / transform', () => {
  it('完整转换', () => {
    expect(transform(input(DDL), {}).startsWith('erDiagram')).toBe(true)
  })

  it('空输入返回空串；超长抛错（边界 / 异常）', () => {
    expect(transform(input('  '), {})).toBe('')
    expect(() => transform(input('x'.repeat(200_001)), {})).toThrow()
  })
})
