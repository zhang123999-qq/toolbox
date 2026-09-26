import { describe, expect, it } from 'vitest'
import { buildJenkinsfile, parseStages, transform } from './utils'
import type { JenkinsfileOptions } from './schema'

const base: JenkinsfileOptions = { agent: 'any', stages: 'build,test', post: true }

describe('jenkinsfile / parseStages', () => {
  it('逗号分隔解析', () => {
    expect(parseStages('build,test')).toEqual(['build', 'test'])
  })

  it('空 stages 抛错', () => {
    expect(() => parseStages('')).toThrow(/stages 不能为空/)
  })

  it('非法 stage 名抛错', () => {
    expect(() => parseStages('bad stage!')).toThrow(/stage 名非法/)
  })
})

describe('jenkinsfile / buildJenkinsfile', () => {
  it('输出 pipeline / agent / stages', () => {
    const out = buildJenkinsfile(base)
    expect(out).toContain('pipeline {')
    expect(out).toContain('agent any')
    expect(out).toContain("stage('build')")
    expect(out).toContain("stage('test')")
  })

  it('勾选 post 输出 post 块', () => {
    expect(buildJenkinsfile(base)).toContain('post {')
    expect(buildJenkinsfile({ ...base, post: false })).not.toContain('post {')
  })

  it('agent none 切换', () => {
    expect(buildJenkinsfile({ ...base, agent: 'none' })).toContain('agent none')
  })
})

describe('jenkinsfile / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('触发即输出 Jenkinsfile', () => {
    expect(transform({ text: 'go' }, base)).toContain('pipeline {')
  })

  it('超长输入抛错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })
})
