// @vitest-environment jsdom
/**
 * semantic-search 组件测试
 * 纯本地 TF-IDF 检索：渲染 / 排序 / 空输入中文报错 / 示例填充
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

const DOCS = [
  '苹果公司推出了新款手机，摄像头和芯片都有大幅升级。',
  '香蕉是一种热带水果，富含钾元素，对心脏健康有益。',
  '新款手机的电池续航提升了两小时，充电速度也更快。',
].join('\n')

function fillAndSearch(docs: string, query: string): void {
  fireEvent.change(screen.getByTestId('input'), { target: { value: docs } })
  fireEvent.change(screen.getByTestId('input-query'), { target: { value: query } })
  fireEvent.click(screen.getByTestId('search'))
}

describe('semantic-search 组件', () => {
  it('渲染文档输入区、查询区与搜索按钮', () => {
    render(<Tool />)
    expect(screen.getByTestId('input')).toBeTruthy()
    expect(screen.getByTestId('input-query')).toBeTruthy()
    expect(screen.getByTestId('search').textContent).toContain('搜索')
  })

  it('按相关度排序：含查询词的文档排在前面并显示分数', () => {
    render(<Tool />)
    fillAndSearch(DOCS, '手机')
    const list = screen.getByTestId('results')
    expect(list.children).toHaveLength(3)
    // 前两名都含「手机」，香蕉文档垫底
    expect(screen.getByTestId('result-0').textContent).toContain('手机')
    expect(screen.getByTestId('result-1').textContent).toContain('手机')
    expect(screen.getByTestId('result-2').textContent).toContain('香蕉')
    expect(screen.getByTestId('result-0').textContent).toMatch(/相似度/)
  })

  it('文档为空时给出中文报错', () => {
    render(<Tool />)
    fillAndSearch('', '手机')
    expect(screen.getByTestId('error').textContent).toContain('文档库为空')
    expect(screen.queryByTestId('results')).toBeNull()
  })

  it('查询为空时给出中文报错', () => {
    render(<Tool />)
    fillAndSearch(DOCS, '   ')
    expect(screen.getByTestId('error').textContent).toContain('请输入查询语句')
  })

  it('示例按钮填充文档库', () => {
    render(<Tool />)
    fireEvent.click(screen.getByTestId('example'))
    expect((screen.getByTestId('input') as HTMLTextAreaElement).value).toContain('苹果公司')
  })
})
