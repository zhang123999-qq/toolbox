/**
 * edge-log（#819）utils 单测：日志查询构造与日志行解析。
 */
import { describe, expect, it } from 'vitest'
import {
  buildGraphqlQuery,
  buildLogQuery,
  EXAMPLE_LOG_LINE,
  parseLogLine,
  parseLogLines,
} from './utils'

describe('buildLogQuery', () => {
  it('基本查询', () => {
    const query = buildLogQuery({
      startTime: '2026-09-28T00:00:00+08:00',
      endTime: '2026-09-28T01:00:00+08:00',
    })
    expect(query.start).toBe('2026-09-27T16:00:00.000Z')
    expect(query.filter).toBe('')
  })
  it('带状态码与节点过滤', () => {
    const query = buildLogQuery({
      startTime: '2026-09-28T00:00:00Z',
      endTime: '2026-09-28T01:00:00Z',
      status: '500',
      colo: 'hkg',
    })
    expect(query.filter).toBe('status=500 AND colo=HKG')
  })
  it('开始时间为空抛错', () => {
    expect(() => buildLogQuery({ startTime: '', endTime: '2026-09-28T01:00:00Z' })).toThrow(
      '开始时间不能为空',
    )
  })
  it('结束时间非法抛错', () => {
    expect(() =>
      buildLogQuery({ startTime: '2026-09-28T00:00:00Z', endTime: 'not-a-time' }),
    ).toThrow('结束时间不是合法时间（须为 ISO 格式）')
  })
  it('开始不早于结束抛错', () => {
    expect(() =>
      buildLogQuery({ startTime: '2026-09-28T02:00:00Z', endTime: '2026-09-28T01:00:00Z' }),
    ).toThrow('开始时间须早于结束时间')
  })
  it('状态码非法抛错', () => {
    expect(() =>
      buildLogQuery({ startTime: '2026-09-28T00:00:00Z', endTime: '2026-09-28T01:00:00Z', status: '50' }),
    ).toThrow('状态码须为 3 位数字')
  })
  it('节点代码非法抛错', () => {
    expect(() =>
      buildLogQuery({ startTime: '2026-09-28T00:00:00Z', endTime: '2026-09-28T01:00:00Z', colo: 'hk' }),
    ).toThrow('节点代码须为 3 位大写字母（如 HKG）')
  })
})

describe('buildGraphqlQuery', () => {
  it('生成查询语句', () => {
    const query = buildLogQuery({
      startTime: '2026-09-28T00:00:00Z',
      endTime: '2026-09-28T01:00:00Z',
      status: '404',
    })
    const gql = buildGraphqlQuery(query)
    expect(gql).toContain('httpRequests1hGroups')
    expect(gql).toContain('status=404')
    expect(gql).toContain('2026-09-28T00:00:00.000Z')
  })
  it('无过滤条件时省略 filter 行', () => {
    const query = buildLogQuery({
      startTime: '2026-09-28T00:00:00Z',
      endTime: '2026-09-28T01:00:00Z',
    })
    expect(buildGraphqlQuery(query)).not.toContain('filter: "status')
  })
})

describe('parseLogLine', () => {
  it('解析 combined 示例行', () => {
    const parsed = parseLogLine(EXAMPLE_LOG_LINE)
    expect(parsed).toMatchObject({
      ip: '203.0.113.10',
      user: 'alice',
      method: 'GET',
      path: '/index.html',
      status: 200,
      size: '1024',
      referer: 'https://example.com/',
      userAgent: 'Mozilla/5.0',
    })
  })
  it('无 referer 的 combined 行', () => {
    const parsed = parseLogLine('203.0.113.10 - - [28/Sep/2026:10:00:01 +0800] "POST /api HTTP/1.1" 500 -')
    expect(parsed.user).toBe('')
    expect(parsed.referer).toBe('')
    expect(parsed.status).toBe(500)
  })
  it('解析 JSON 行', () => {
    const parsed = parseLogLine(
      JSON.stringify({ clientIp: '1.2.3.4', method: 'GET', url: '/x', status: 200 }),
    )
    expect(parsed.ip).toBe('1.2.3.4')
    expect(parsed.path).toBe('/x')
  })
  it('解析完整 JSON 行', () => {
    const parsed = parseLogLine(
      JSON.stringify({
        ip: '9.9.9.9',
        user: 'bob',
        time: '2026-09-28T00:00:00Z',
        method: 'POST',
        path: '/api',
        status: 201,
        size: '42',
        referer: 'https://r.com',
        userAgent: 'UA',
      }),
    )
    expect(parsed).toMatchObject({
      ip: '9.9.9.9',
      user: 'bob',
      time: '2026-09-28T00:00:00Z',
      method: 'POST',
      path: '/api',
      status: 201,
      size: '42',
      referer: 'https://r.com',
      userAgent: 'UA',
    })
  })
  it('JSON 空对象走默认值', () => {
    const parsed = parseLogLine('{}')
    expect(parsed.ip).toBe('')
    expect(parsed.user).toBe('')
    expect(parsed.status).toBe(0)
  })
  it('空行抛错', () => {
    expect(() => parseLogLine('   ')).toThrow('日志行为空')
  })
  it('非法 JSON 抛错', () => {
    expect(() => parseLogLine('{bad')).toThrow('日志行不是合法 JSON')
  })
  it('JSON 数组抛错', () => {
    expect(() => parseLogLine('[1,2]')).toThrow('JSON 日志行须为对象')
  })
  it('无法识别格式抛错', () => {
    expect(() => parseLogLine('random text line')).toThrow('无法识别的日志格式')
  })
})

describe('parseLogLines', () => {
  it('批量解析', () => {
    const parsed = parseLogLines(EXAMPLE_LOG_LINE + '\n' + EXAMPLE_LOG_LINE)
    expect(parsed).toHaveLength(2)
  })
  it('空输入抛错', () => {
    expect(() => parseLogLines('  \n  ')).toThrow('没有可解析的日志行')
  })
  it('错误行带序号', () => {
    expect(() => parseLogLines(EXAMPLE_LOG_LINE + '\nbad line')).toThrow('第 2 行：无法识别的日志格式')
  })
})
