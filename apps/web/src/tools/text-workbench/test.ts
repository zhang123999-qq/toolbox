import { describe, expect, it } from 'vitest'
import { STEP_HELP, pipelineFinal, pipelineHtml } from './utils'

describe('text-workbench / pipelineFinal', () => {
  it('按顺序跑完整条流水线', () => {
    const out = pipelineFinal(
      { text: '  b  \n\na\nb' },
      { steps: 'trim\ndrop-empty\ndedupe\nsort' },
    )
    expect(out).toBe('a\nb')
  })

  it('空输入返回空串', () => {
    expect(pipelineFinal({ text: '' }, { steps: 'trim' })).toBe('')
  })

  it('带参数的步骤生效', () => {
    expect(pipelineFinal({ text: 'a\nb' }, { steps: 'prefix=- ' })).toBe('- a\n- b')
    expect(pipelineFinal({ text: 'a\nb' }, { steps: 'suffix=;' })).toBe('a;\nb;')
    expect(pipelineFinal({ text: 'ab' }, { steps: 'replace=a>x' })).toBe('xb')
  })

  it('取前 N 行与丢前 N 行', () => {
    expect(pipelineFinal({ text: 'a\nb\nc' }, { steps: 'take=2' })).toBe('a\nb')
    expect(pipelineFinal({ text: 'a\nb\nc' }, { steps: 'drop=1' })).toBe('b\nc')
  })

  it('未知步骤被跳过且不破坏结果', () => {
    expect(pipelineFinal({ text: 'a\nb' }, { steps: 'nope\nsort' })).toBe('a\nb')
  })

  it('注释行与空行被忽略', () => {
    expect(pipelineFinal({ text: 'b\na' }, { steps: '# 注释\n\nsort' })).toBe('a\nb')
  })
})

describe('text-workbench / pipelineHtml', () => {
  it('列出每个阶段', () => {
    const html = pipelineHtml({ text: 'b\na' }, { steps: 'sort\nupper' })
    expect(html).toContain('1. sort')
    expect(html).toContain('2. upper')
  })

  it('未识别的步骤给出提示', () => {
    expect(pipelineHtml({ text: 'a' }, { steps: 'zzz' })).toContain('未识别的步骤')
  })

  it('没有步骤时给出说明', () => {
    expect(pipelineHtml({ text: 'a' }, { steps: '' })).toContain('没有可执行的步骤')
  })

  it('HTML 特殊字符被转义', () => {
    expect(pipelineHtml({ text: '<script>' }, { steps: 'trim' })).toContain('&lt;script&gt;')
  })
})

describe('text-workbench / STEP_HELP', () => {
  it('步骤清单非空', () => {
    expect(STEP_HELP.length).toBeGreaterThan(10)
  })
})
