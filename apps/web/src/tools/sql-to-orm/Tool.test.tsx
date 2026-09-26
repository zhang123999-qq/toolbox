// @vitest-environment jsdom
/**
 * sql-to-orm 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error(`缺少 data-testid="${id}" 的元素（DEVELOPMENT.md §8.3 要求）`)
  return el
}

describe('sql-to-orm · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」默认输出 Sequelize 模型', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain("sequelize.define('users'")
    expect(output).toContain('DataTypes.STRING(100)')
  })

  it('切到 TypeORM 后输出 @Entity', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByLabelText('目标'), { target: { value: 'typeorm' } })
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain("@Entity('users')")
    expect(output).toContain('@PrimaryGeneratedColumn()')
  })

  it('无法解析时输出区转为 role=alert', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'SELECT 1;' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
