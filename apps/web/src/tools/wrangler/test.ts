/**
 * wrangler（#810）utils 单测：命令字典、参数解析与命令拼装。
 */
import { describe, expect, it } from 'vitest'
import { buildCommand, COMMANDS, EXAMPLE_ARGS, getCommandDef, parseArgsText } from './utils'

describe('getCommandDef', () => {
  it('取到已知命令定义', () => {
    expect(getCommandDef('deploy').title).toBe('发布 Worker')
    expect(COMMANDS).toHaveLength(7)
  })
  it('未知 action 中文抛错', () => {
    expect(() => getCommandDef('fly')).toThrow('未知命令：fly')
  })
})

describe('parseArgsText', () => {
  it('解析 key=value 多行', () => {
    expect(parseArgsText(EXAMPLE_ARGS)).toEqual({ binding: 'MY_KV', key: 'hello', value: 'world' })
  })
  it('跳过空行，同名后者覆盖', () => {
    expect(parseArgsText('a=1\n\na=2')).toEqual({ a: '2' })
  })
  it('空文本返回空对象', () => {
    expect(parseArgsText('')).toEqual({})
  })
  it('无等号行抛错带行号', () => {
    expect(() => parseArgsText('a=1\nbadline')).toThrow('第 2 行参数格式非法')
  })
})

describe('buildCommand', () => {
  it('deploy 无参/带 name', () => {
    expect(buildCommand('deploy', {})).toBe('npx wrangler deploy')
    expect(buildCommand('deploy', { name: 'my-worker' })).toBe(
      'npx wrangler deploy --name my-worker',
    )
  })
  it('dev 无参/合法端口/非法端口', () => {
    expect(buildCommand('dev', {})).toBe('npx wrangler dev')
    expect(buildCommand('dev', { port: '8787' })).toBe('npx wrangler dev --port 8787')
    expect(() => buildCommand('dev', { port: 'abc' })).toThrow('port 须为数字')
  })
  it('tail', () => {
    expect(buildCommand('tail', {})).toBe('npx wrangler tail')
  })
  it('kv-put 拼装与缺参', () => {
    expect(buildCommand('kv-put', { binding: 'MY_KV', key: 'k', value: 'v' })).toBe(
      'npx wrangler kv:key put --binding=MY_KV k v',
    )
    expect(() => buildCommand('kv-put', { binding: 'MY_KV', key: 'k' })).toThrow(
      '缺少必填参数：value',
    )
    expect(() => buildCommand('kv-put', { binding: '  ', key: 'k', value: 'v' })).toThrow(
      '缺少必填参数：binding',
    )
  })
  it('kv-get 拼装与缺参', () => {
    expect(buildCommand('kv-get', { binding: 'MY_KV', key: 'k' })).toBe(
      'npx wrangler kv:key get --binding=MY_KV k',
    )
    expect(() => buildCommand('kv-get', { binding: 'MY_KV' })).toThrow('缺少必填参数：key')
  })
  it('d1-execute 拼装与缺参', () => {
    expect(buildCommand('d1-execute', { database: 'app-db', sql: 'SELECT 1' })).toBe(
      'npx wrangler d1 execute app-db --command="SELECT 1"',
    )
    expect(() => buildCommand('d1-execute', { database: 'app-db' })).toThrow('缺少必填参数：sql')
  })
  it('r2-upload 拼装与缺参', () => {
    expect(buildCommand('r2-upload', { bucket: 'my-bucket', file: 'dist/app.js' })).toBe(
      'npx wrangler r2 object put my-bucket/dist/app.js --file=dist/app.js',
    )
    expect(() => buildCommand('r2-upload', { bucket: 'my-bucket' })).toThrow('缺少必填参数：file')
    expect(() => buildCommand('r2-upload', { file: 'dist/app.js' })).toThrow('缺少必填参数：bucket')
  })
  it('未知 action 中文抛错', () => {
    expect(() => buildCommand('fly', {})).toThrow('未知命令：fly')
  })
})
