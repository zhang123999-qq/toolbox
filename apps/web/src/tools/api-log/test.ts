/**
 * api-log（#765）utils 单测：访问日志解析与统计。
 */
import { describe, expect, it } from 'vitest'
import { analyzeLogs, parseAccessLog, parseLogTime, type LogEntry } from './utils'

const L1 =
  '127.0.0.1 - - [10/Oct/2000:13:55:36 -0700] "GET /api/users HTTP/1.1" 200 2326 "-" "curl/8.0" 0.012'
const L2 =
  '127.0.0.1 - - [10/Oct/2000:13:55:37 -0700] "POST /api/orders HTTP/1.1" 201 512 "-" "curl/8.0" 0.105'
const L3 =
  '127.0.0.1 - - [10/Oct/2000:13:56:01 -0700] "GET /api/users HTTP/1.1" 500 128 "-" "curl/8.0" 1.204'
const L4 =
  '10.0.0.2 - frank [10/Oct/2000:14:02:11 -0700] "GET /health HTTP/1.0" 200 16 "http://x/" "Mozilla"'

describe('parseLogTime', () => {
  it('解析带时区的时间', () => {
    // 13:55:36 -0700 = 20:55:36 UTC
    expect(parseLogTime('10/Oct/2000:13:55:36 -0700')).toBe(Date.UTC(2000, 9, 10, 20, 55, 36))
  })
  it('正时区', () => {
    expect(parseLogTime('10/Oct/2000:13:55:36 +0800')).toBe(Date.UTC(2000, 9, 10, 5, 55, 36))
  })
  it('格式非法抛错', () => {
    expect(() => parseLogTime('2000-10-10')).toThrow('时间格式非法')
  })
  it('未知月份抛错', () => {
    expect(() => parseLogTime('10/Xxx/2000:13:55:36 -0700')).toThrow('未知月份')
  })
})

describe('parseAccessLog', () => {
  it('解析标准 combined 行', () => {
    const { entries, skipped } = parseAccessLog(L1)
    expect(skipped).toBe(0)
    expect(entries).toHaveLength(1)
    const e = entries[0]
    expect(e.ip).toBe('127.0.0.1')
    expect(e.method).toBe('GET')
    expect(e.path).toBe('/api/users')
    expect(e.status).toBe(200)
    expect(e.bytes).toBe(2326)
    expect(e.ms).toBe(12)
  })
  it('无耗时字段时 ms 缺省', () => {
    const { entries } = parseAccessLog(L4)
    expect(entries[0].ms).toBeUndefined()
    expect(entries[0].bytes).toBe(16)
  })
  it('bytes 为 - 时记 0', () => {
    const line =
      '127.0.0.1 - - [10/Oct/2000:13:55:36 -0700] "GET /x HTTP/1.1" 304 - "-" "curl/8.0"'
    const { entries } = parseAccessLog(line)
    expect(entries[0].bytes).toBe(0)
    expect(entries[0].status).toBe(304)
  })
  it('非法行跳过并计数', () => {
    const { entries, skipped } = parseAccessLog(L1 + '\n这行非法\n\n' + L2)
    expect(entries).toHaveLength(2)
    expect(skipped).toBe(1)
  })
  it('时间非法行被跳过', () => {
    const line =
      '127.0.0.1 - - [bad-time] "GET /x HTTP/1.1" 200 10 "-" "curl/8.0"'
    const { entries, skipped } = parseAccessLog(line)
    expect(entries).toHaveLength(0)
    expect(skipped).toBe(1)
  })
  it('bytes 非数字行被跳过', () => {
    const line =
      '127.0.0.1 - - [10/Oct/2000:13:55:36 -0700] "GET /x HTTP/1.1" 200 abc "-" "curl/8.0"'
    const { entries, skipped } = parseAccessLog(line)
    expect(entries).toHaveLength(0)
    expect(skipped).toBe(1)
  })
  it('空文本返回空', () => {
    expect(parseAccessLog('  \n ')).toEqual({ entries: [], skipped: 0 })
  })
})

describe('analyzeLogs', () => {
  const entries = parseAccessLog([L1, L2, L3, L4].join('\n')).entries

  it('状态码分布与错误率', () => {
    const s = analyzeLogs(entries)
    expect(s.total).toBe(4)
    expect(s.statusDist).toEqual({ '2xx': 3, '5xx': 1 })
    expect(s.errorRate).toBe(0.25)
  })
  it('热点路径统计', () => {
    const s = analyzeLogs(entries)
    expect(s.topPaths[0].path).toBe('/api/users')
    expect(s.topPaths[0].count).toBe(2)
    expect(s.topPaths[0].errors).toBe(1)
  })
  it('平均耗时', () => {
    const s = analyzeLogs(entries)
    expect(s.hasTiming).toBe(true)
    const users = s.topPaths.find((p) => p.path === '/api/users')
    // (12 + 1204) / 2 = 608
    expect(users?.avgMs).toBe(608)
  })
  it('无耗时字段时 avgMs 为 null', () => {
    const s = analyzeLogs(parseAccessLog(L4).entries)
    expect(s.hasTiming).toBe(false)
    expect(s.topPaths[0].avgMs).toBeNull()
  })
  it('峰值小时', () => {
    const s = analyzeLogs(entries)
    expect(s.peakHour?.count).toBe(3)
    expect(s.peakHour?.hour).toContain('2000-10-10T20')
  })
  it('空条目统计为零', () => {
    const s = analyzeLogs([] as LogEntry[])
    expect(s.total).toBe(0)
    expect(s.errorRate).toBe(0)
    expect(s.topPaths).toEqual([])
    expect(s.peakHour).toBeNull()
    expect(s.hasTiming).toBe(false)
  })
})
