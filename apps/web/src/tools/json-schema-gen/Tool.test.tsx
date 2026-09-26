// @vitest-environment jsdom
/**
 * json-schema-gen 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error(`缺少 data-testid="${id}" 的元素（DEVELOPMENT.md §8.3 要求）`)
  return el
}

/** 生成结果里本工具会用到的字段，供断言访问嵌套结构 */
interface Generated {
  readonly $schema?: string
  readonly properties?: Record<string, unknown>
  readonly required?: string[]
  readonly items?: Generated
}

/** 把输出区文本按 JSON 解析，避免断言被缩进与换行细节绑架 */
function outputJson(): Generated {
  return JSON.parse(byTestId('output').textContent ?? '') as Generated
}

describe('json-schema-gen · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('输入对象后推断出 properties 与 required', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"a":1}' } })
    expect(outputJson()).toMatchObject({
      type: 'object',
      properties: { a: { type: 'integer' } },
      required: ['a'],
    })
  })

  it('输入非法 JSON 时输出区转为 role=alert 的错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"a":' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('点击「示例」产出 draft-07 的 Schema', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(outputJson().$schema).toBe('http://json-schema.org/draft-07/schema#')
    expect(outputJson().properties).toHaveProperty('meta')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('format 切到 draft-2020-12 后 $schema 随之变化', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"a":1}' } })
    fireEvent.change(screen.getByLabelText('格式'), { target: { value: 'draft-2020-12' } })
    expect(outputJson().$schema).toBe('https://json-schema.org/draft/2020-12/schema')
  })

  it('勾选「严格模式」后对象数组的 required 取全部键', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '[{"a":1},{"b":2}]' } })
    expect(outputJson().items?.required).toBeUndefined()

    fireEvent.click(screen.getByLabelText('严格模式'))

    expect(outputJson().items?.required).toEqual(['a', 'b'])
  })
})
