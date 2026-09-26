import { describe, expect, it } from 'vitest'
import { JsonToPythonError, transform } from './utils'
import type { JsonToPythonOptions } from './schema'

const baseOptions: JsonToPythonOptions = { style: 'dataclass', mode: 'snake', indent: '4' }

describe('json-to-python / transform', () => {
  it('生成 import 头与 dataclass', () => {
    const out = transform({ text: '{"a":1}' }, baseOptions)
    expect(out.startsWith('from dataclasses import dataclass')).toBe(true)
    expect(out).toContain('@dataclass')
    expect(out).toContain('class Root:')
    expect(out).toContain('    a: int')
  })

  it('类型映射 str/bool/float', () => {
    const out = transform({ text: '{"s":"x","b":true,"d":1.5}' }, baseOptions)
    expect(out).toContain('    s: str')
    expect(out).toContain('    b: bool')
    expect(out).toContain('    d: float')
  })

  it('camelCase 转 snake_case 并附原名注释', () => {
    const out = transform({ text: '{"userId":1}' }, baseOptions)
    expect(out).toContain('    # 原 JSON 键: "userId"')
    expect(out).toContain('    user_id: int')
  })

  it('嵌套类先声明', () => {
    const out = transform({ text: '{"profile":{"isVip":true}}' }, baseOptions)
    expect(out.indexOf('class Profile')).toBeLessThan(out.indexOf('class Root'))
    expect(out).toContain('    profile: Profile')
  })

  it('数组与 null', () => {
    expect(transform({ text: '{"tags":["a"]}' }, baseOptions)).toContain('    tags: List[str]')
    expect(transform({ text: '{"note":null}' }, baseOptions)).toContain('    note: Any')
  })

  it('数组多条样本缺失字段为 Optional', () => {
    const out = transform({ text: '{"items":[{"x":1},{"y":2}]}' }, baseOptions)
    expect(out).toContain('    x: Optional[int]')
    expect(out).toContain('    y: Optional[int]')
    expect(out).toContain('    items: List[Item]')
  })

  it('pydantic 风格继承 BaseModel', () => {
    const out = transform({ text: '{"a":1}' }, { ...baseOptions, style: 'pydantic' })
    expect(
      out.startsWith('from typing import Any, List, Optional\n\nfrom pydantic import BaseModel'),
    ).toBe(true)
    expect(out).toContain('class Root(BaseModel):')
  })

  it('typedict 风格继承 TypedDict', () => {
    const out = transform({ text: '{"a":1}' }, { ...baseOptions, style: 'typedict' })
    expect(out).toContain('from typing import Any, List, Optional, TypedDict')
    expect(out).toContain('class Root(TypedDict):')
  })

  it('空对象生成 pass（边界）', () => {
    expect(transform({ text: '{"empty":{}}' }, baseOptions)).toContain('    pass')
  })

  it('关键字字段加尾下划线', () => {
    expect(transform({ text: '{"class":1}' }, baseOptions)).toContain('    class_: int')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, baseOptions)).toBe('')
  })

  it('非法 JSON / 非标量根 / 超长抛错（异常）', () => {
    expect(() => transform({ text: '{x' }, baseOptions)).toThrow(JsonToPythonError)
    expect(() => transform({ text: '1' }, baseOptions)).toThrow(JsonToPythonError)
    expect(() => transform({ text: `{"a":"${'x'.repeat(2_000_000)}"}` }, baseOptions)).toThrow(
      JsonToPythonError,
    )
  })
})
