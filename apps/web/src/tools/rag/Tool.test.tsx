// @vitest-environment jsdom
/**
 * rag 组件测试
 * 纯本地问答：渲染 / 提问出答案与片段 / 空输入与非法 k 的中文报错 / 示例填充
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

const TEXT =
  'TF-IDF 是一种常用的文本检索算法。它的全称是词频 - 逆文档频率。' +
  '词频衡量一个词在文档中出现的频率，逆文档频率衡量一个词的稀缺程度。' +
  '余弦相似度用于比较两个向量的夹角，夹角越小表示两个文本越相似。'

function fillAndAsk(text: string, query: string, k = '3'): void {
  fireEvent.change(screen.getByTestId('input'), { target: { value: text } })
  fireEvent.change(screen.getByTestId('input-query'), { target: { value: query } })
  fireEvent.change(screen.getByTestId('k-input'), { target: { value: k } })
  fireEvent.click(screen.getByTestId('ask'))
}

describe('rag 组件', () => {
  it('渲染文档输入区、问题区、k 输入与提问按钮', () => {
    render(<Tool />)
    expect(screen.getByTestId('input')).toBeTruthy()
    expect(screen.getByTestId('input-query')).toBeTruthy()
    expect(screen.getByTestId('k-input')).toBeTruthy()
    expect(screen.getByTestId('ask').textContent).toContain('提问')
  })

  it('提问后展示抽取式答案与命中的片段', () => {
    render(<Tool />)
    fillAndAsk(TEXT, '什么是 TF-IDF')
    const answer = screen.getByTestId('answer')
    expect(answer.textContent ?? '').toContain('TF-IDF')
    const chunks = screen.getByTestId('chunks')
    expect(chunks.children.length).toBeGreaterThan(0)
    expect(screen.getByTestId('chunk-0').textContent).toMatch(/相似度/)
  })

  it('文档为空时给出中文报错', () => {
    render(<Tool />)
    fillAndAsk('', '什么是 TF-IDF')
    expect(screen.getByTestId('error').textContent).toContain('请先输入文档内容')
    expect(screen.queryByTestId('answer')).toBeNull()
  })

  it('问题为空时给出中文报错', () => {
    render(<Tool />)
    fillAndAsk(TEXT, '  ')
    expect(screen.getByTestId('error').textContent).toContain('请输入问题')
  })

  it('k 非法时给出中文报错', () => {
    render(<Tool />)
    fillAndAsk(TEXT, '什么是 TF-IDF', 'abc')
    expect(screen.getByTestId('error').textContent).toContain('检索片段数必须是数字')
  })

  it('k 超出范围时给出中文报错', () => {
    render(<Tool />)
    fillAndAsk(TEXT, '什么是 TF-IDF', '0')
    expect(screen.getByTestId('error').textContent).toContain('检索片段数不能小于 1')
  })

  it('示例按钮填充文档内容', () => {
    render(<Tool />)
    fireEvent.click(screen.getByTestId('example'))
    expect((screen.getByTestId('input') as HTMLTextAreaElement).value).toContain('TF-IDF')
  })
})
