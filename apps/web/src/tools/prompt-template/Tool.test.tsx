// @vitest-environment jsdom
/**
 * prompt-template 组件测试
 * 模板选择 / 变量填充与预览 / 缺失提示 / 清空 / 自定义模板
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'
import { PROMPT_TEMPLATES } from './utils'

afterEach(cleanup)

describe('prompt-template 组件', () => {
  it('渲染模板下拉框（8 个内置模板）', () => {
    render(<Tool />)
    const select = screen.getByTestId('template-select') as HTMLSelectElement
    expect(select.options.length).toBe(PROMPT_TEMPLATES.length)
    expect(select.options[0]?.textContent).toContain('翻译助手')
  })

  it('填写变量后预览实时更新，缺失提示消失', () => {
    render(<Tool />)
    // 默认选中 translate，变量：目标语言、原文
    const langInput = screen.getByTestId('var-目标语言')
    const textInput = screen.getByTestId('var-原文')
    fireEvent.change(langInput, { target: { value: '英语' } })
    // 只填一个：缺失提示还在
    expect(screen.getByTestId('missing-hint').textContent).toContain('原文')
    fireEvent.change(textInput, { target: { value: '你好' } })
    expect(screen.queryByTestId('missing-hint')).toBeNull()
    const preview = screen.getByTestId('preview')
    expect(preview.textContent).toContain('英语')
    expect(preview.textContent).toContain('你好')
    expect(preview.textContent).not.toContain('{{')
  })

  it('未填变量时预览保留占位符', () => {
    render(<Tool />)
    expect(screen.getByTestId('preview').textContent).toContain('{{目标语言}}')
  })

  it('清空变量按钮重置所有变量输入', () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('var-目标语言'), { target: { value: '英语' } })
    fireEvent.click(screen.getByTestId('clear-vars'))
    expect((screen.getByTestId('var-目标语言') as HTMLInputElement).value).toBe('')
    expect(screen.getByTestId('preview').textContent).toContain('{{目标语言}}')
  })

  it('切换模板后变量输入按新模板重新生成', () => {
    render(<Tool />)
    const select = screen.getByTestId('template-select')
    fireEvent.change(select, { target: { value: 'sql' } })
    // sql 模板变量：需求描述、数据库类型
    expect(screen.getByTestId('var-需求描述')).toBeTruthy()
    expect(screen.queryByTestId('var-目标语言')).toBeNull()
  })

  it('左侧填写自定义模板时优先使用自定义模板', () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('input'), {
      target: { value: '请用{{语气}}的语气说{{内容}}' },
    })
    expect(screen.getByTestId('var-语气')).toBeTruthy()
    expect(screen.getByTestId('var-内容')).toBeTruthy()
    fireEvent.change(screen.getByTestId('var-语气'), { target: { value: '幽默' } })
    fireEvent.change(screen.getByTestId('var-内容'), { target: { value: '早安' } })
    expect(screen.getByTestId('preview').textContent).toContain('请用幽默的语气说早安')
  })
})
