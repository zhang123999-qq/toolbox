/**
 * worker-template（#806）utils 单测：名称校验、路由解析与模板生成。
 */
import { describe, expect, it } from 'vitest'
import { generateWorker, parseRoutesText, validateWorkerName, type WorkerOptions } from './utils'

describe('validateWorkerName', () => {
  it('合法名称通过', () => {
    expect(() => validateWorkerName('my-worker-1')).not.toThrow()
    expect(() => validateWorkerName('a')).not.toThrow()
  })
  it('空名称抛错', () => {
    expect(() => validateWorkerName('   ')).toThrow('Worker 名称不能为空')
  })
  it('超长抛错', () => {
    expect(() => validateWorkerName('a'.repeat(64))).toThrow('不能超过 63 个字符')
  })
  it('大写/下划线/首字符连字符抛错', () => {
    expect(() => validateWorkerName('MyWorker')).toThrow('只能包含小写字母、数字与连字符')
    expect(() => validateWorkerName('my_worker')).toThrow('只能包含小写字母、数字与连字符')
    expect(() => validateWorkerName('-worker')).toThrow('只能包含小写字母、数字与连字符')
  })
})

describe('parseRoutesText', () => {
  it('解析多行路由并转大写', () => {
    const routes = parseRoutesText('GET /api/users\npost /api/orders')
    expect(routes).toEqual([
      { method: 'GET', path: '/api/users' },
      { method: 'POST', path: '/api/orders' },
    ])
  })
  it('跳过空行与注释行', () => {
    expect(parseRoutesText('\n# 注释\nGET /x\n')).toEqual([{ method: 'GET', path: '/x' }])
  })
  it('空文本返回空数组', () => {
    expect(parseRoutesText('')).toEqual([])
  })
  it('格式非法行抛错并带行号', () => {
    expect(() => parseRoutesText('GET /ok\nBADLINE')).toThrow('第 2 行路由格式非法')
  })
})

function baseOpts(): WorkerOptions {
  return {
    name: 'demo-worker',
    features: ['router'],
    routes: [{ method: 'GET', path: '/api/users' }],
  }
}

describe('generateWorker', () => {
  it('生成含路由分发的代码', () => {
    const code = generateWorker(baseOpts())
    expect(code).toContain('export default {')
    expect(code).toContain('handleRoute0')
    expect(code).toContain("url.pathname === '/api/users' && request.method === 'GET'")
    expect(code).toContain('[demo-worker] Not Found')
  })
  it('无绑定时 Env 为空注释', () => {
    expect(generateWorker(baseOpts())).toContain('// 暂无绑定')
  })
  it('kv/d1/r2 绑定写入 Env', () => {
    const code = generateWorker({ ...baseOpts(), features: ['kv', 'd1', 'r2'] })
    expect(code).toContain('MY_KV: KVNamespace')
    expect(code).toContain('DB: D1Database')
    expect(code).toContain('BUCKET: R2Bucket')
  })
  it('特性去重', () => {
    const code = generateWorker({ ...baseOpts(), features: ['kv', 'kv'] })
    expect(code.match(/MY_KV: KVNamespace/g)).toHaveLength(1)
  })
  it('cron 特性生成 scheduled 且要求表达式', () => {
    const code = generateWorker({ ...baseOpts(), features: ['cron'], cronSchedule: '*/5 * * * *' })
    expect(code).toContain('async scheduled')
    expect(code).toContain('cron 表达式: */5 * * * *')
    expect(() => generateWorker({ ...baseOpts(), features: ['cron'], cronSchedule: '  ' })).toThrow(
      '必须填写 cron 表达式',
    )
  })
  it('未选 router 时不生成路由分支', () => {
    const code = generateWorker({ ...baseOpts(), features: [] })
    expect(code).not.toContain('handleRoute0')
    expect(code).toContain('Not Found')
  })
  it('选了 router 但无路由时不生成分支', () => {
    const code = generateWorker({ ...baseOpts(), routes: [] })
    expect(code).not.toContain('handleRoute0')
  })
  it('非法名称抛错', () => {
    expect(() => generateWorker({ ...baseOpts(), name: 'Bad Name' })).toThrow('只能包含小写字母')
  })
})
