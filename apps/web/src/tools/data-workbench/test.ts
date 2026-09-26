import { describe, expect, it } from 'vitest'
import {
  DataWorkbenchError,
  csvToJson,
  jsonToYaml,
  runPipeline,
  stepNames,
  transform,
  yamlToJson,
} from './utils'
import type { WorkbenchInput, WorkbenchOptions } from './schema'

function options(steps: string, mode: 'steps' | 'final' = 'final'): WorkbenchOptions {
  return { steps, mode }
}

describe('data-workbench / transform', () => {
  it('多步流水线按序生效：整理行 → 排序 → 去重', () => {
    const input: WorkbenchInput = { text: '  b  \n\na\nb\n' }
    expect(transform(input, options('trimlines\nremoveempty\nsort\ndedupe'))).toBe('a\nb')
  })

  it('steps 模式分段展示每一步的结果', () => {
    const out = transform({ text: 'ab' }, options('upper\nprefix(-)\nlower', 'steps'))
    expect(out).toContain('== 输入 ==')
    expect(out).toContain('== 步骤 1 · upper ==')
    expect(out).toContain('== 步骤 3 · lower( ) =='.replace('( )', ''))
    expect(out).toContain('== 最终结果 ==')
    expect(out.trimEnd().endsWith('-ab')).toBe(true)
  })

  it('注释行与空行被跳过', () => {
    expect(transform({ text: 'x' }, options('# 注释\n\nupper'))).toBe('X')
  })

  it('JSON 与 YAML 互转能 Round-trip', () => {
    const json = '{"name":"工具库","tools":870,"tags":["json","yaml"],"nested":{"ok":true}}'
    const yaml = jsonToYaml(json, 2)
    expect(yaml).toContain('name: 工具库')
    expect(yaml).toContain('- json')
    const back = JSON.parse(yamlToJson(yaml, 2)) as Record<string, unknown>
    expect(back.tools).toBe(870)
    expect(back.tags).toEqual(['json', 'yaml'])
    expect((back.nested as Record<string, unknown>).ok).toBe(true)
  })

  it('YAML 序列里的对象也能解析回来', () => {
    const yaml = ['users:', '  - name: 张三', '    age: 18', '  - name: 李四', '    age: 20'].join(
      '\n',
    )
    const parsed = JSON.parse(yamlToJson(yaml, 2)) as { users: { name: string; age: number }[] }
    expect(parsed.users).toHaveLength(2)
    expect(parsed.users[0]).toEqual({ name: '张三', age: 18 })
  })

  it('CSV 转 JSON 默认取首行为表头，noheader 时输出二维数组', () => {
    const csv = 'name,age\n张三,18\n李四,20'
    expect(JSON.parse(csvToJson(csv, true)) as unknown[]).toEqual([
      { name: '张三', age: '18' },
      { name: '李四', age: '20' },
    ])
    expect(JSON.parse(csvToJson(csv, false)) as string[][]).toHaveLength(3)
  })

  it('CSV 支持带引号的字段（内含逗号）', () => {
    const csv = 'name,note\n张三,"喜欢 A,B 两个"\n'
    const rows = JSON.parse(csvToJson(csv, true)) as { note: string }[]
    expect(rows[0]?.note).toBe('喜欢 A,B 两个')
  })

  it('JSON 与 CSV 互转', () => {
    const json = '[{"a":1,"b":"x,y"}]'
    const csv = transform({ text: json }, options('json2csv'))
    expect(csv).toBe('a,b\n1,"x,y"')
  })

  it('编码类步骤可还原', () => {
    expect(transform({ text: '工具' }, options('base64'))).toBe('5bel5YW3')
    expect(transform({ text: '5bel5YW3' }, options('base64decode'))).toBe('工具')
    expect(transform({ text: 'a b' }, options('urlencode'))).toBe('a%20b')
    expect(transform({ text: 'e5b7a5' }, options('hexdecode'))).toBe('工')
    expect(transform({ text: '工' }, options('hex'))).toBe('e5b7a5')
  })

  it('replace 与 replaceRegex 支持参数', () => {
    expect(transform({ text: 'a-b-a' }, options('replace(a,X)'))).toBe('X-b-X')
    expect(transform({ text: 'a1b22c' }, options('replaceRegex(\\d+,N)'))).toBe('aNbNc')
  })

  it('步骤为空时给出提示文案（边界）', () => {
    expect(transform({ text: 'x' }, options('', 'steps'))).toContain('没有可执行的步骤')
    expect(transform({ text: 'x' }, options('# 只有注释'))).toBe('')
  })

  it('空输入返回空字符串（边界）', () => {
    expect(transform({ text: '' }, options('upper'))).toBe('')
    expect(transform({ text: '  \n ' }, options('upper'))).toBe('')
  })

  it('未知步骤抛 DataWorkbenchError 并列出可用步骤（异常）', () => {
    expect(() => transform({ text: 'x' }, options('nope'))).toThrow(DataWorkbenchError)
    expect(() => transform({ text: 'x' }, options('nope'))).toThrow(/可用步骤/)
    expect(stepNames()).toContain('jsonformat')
  })

  it('步骤内部失败时报错指明是哪一步（异常）', () => {
    expect(() => transform({ text: '{oops' }, options('jsonformat'))).toThrow(DataWorkbenchError)
    expect(() => transform({ text: '{oops' }, options('jsonformat'))).toThrow(/jsonFormat 失败/)
    expect(() => transform({ text: '!!非法!!' }, options('base64decode'))).toThrow(
      DataWorkbenchError,
    )
  })

  it('超长输入抛出中文上限提示（边界）', () => {
    expect(() => transform({ text: 'x'.repeat(200_001) }, options('upper'))).toThrow(
      DataWorkbenchError,
    )
  })

  it('runPipeline 返回每步产出，便于单独断言中间态', () => {
    const results = runPipeline('b\na', options('sort\nupper'))
    expect(results.map((item) => item.name)).toEqual(['sort', 'upper'])
    expect(results[0]?.output).toBe('a\nb')
    expect(results[1]?.output).toBe('A\nB')
  })
})
