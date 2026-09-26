import { describe, expect, it } from 'vitest'
import { buildGitlabCi, normalizeImage, parseScript, parseStages, transform } from './utils'
import type { GitlabCiOptions } from './schema'

const base: GitlabCiOptions = {
  image: 'node:20',
  stages: 'build,test,deploy',
  script: 'npm ci\nnpm test',
}

describe('gitlab-ci / parseStages', () => {
  it('逗号分隔解析', () => {
    expect(parseStages('build,test,deploy')).toEqual(['build', 'test', 'deploy'])
  })

  it('空 stages 抛错', () => {
    expect(() => parseStages('')).toThrow(/stages 不能为空/)
  })

  it('非法 stage 名抛错', () => {
    expect(() => parseStages('bad stage!')).toThrow(/stage 名非法/)
  })
})

describe('gitlab-ci / parseScript', () => {
  it('按行解析命令', () => {
    expect(parseScript('npm ci\nnpm test')).toEqual(['npm ci', 'npm test'])
  })

  it('空脚本抛错', () => {
    expect(() => parseScript('')).toThrow(/脚本步骤不能为空/)
  })
})

describe('gitlab-ci / buildGitlabCi', () => {
  it('输出 image / stages / job', () => {
    const out = buildGitlabCi(base)
    expect(out).toContain('image: node:20')
    expect(out).toContain('  - build')
    expect(out).toContain('  - test')
    expect(out).toContain('  - deploy')
    expect(out).toContain('    - "npm ci"')
    expect(out).toContain('    - "npm test"')
  })

  it('脚本命令以双引号安全引用，含冒号/井号不破坏 YAML', () => {
    const out = buildGitlabCi({ ...base, script: 'echo a: b # c\nnpm ci' })
    expect(out).toContain('    - "echo a: b # c"')
    expect(out).toContain('    - "npm ci"')
  })

  it('空镜像回退 node:20', () => {
    expect(buildGitlabCi({ ...base, image: '' })).toContain('image: node:20')
  })

  it('镜像名含引号/换行时拒绝（防 YAML 结构破坏）', () => {
    expect(() => normalizeImage("node:20'")).toThrow(/镜像名格式非法/)
    expect(() => normalizeImage('node:20\n  malicious: true')).toThrow(/镜像名格式非法/)
    expect(normalizeImage('registry.example.com/org/img:latest')).toBe(
      'registry.example.com/org/img:latest',
    )
  })
})

describe('gitlab-ci / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('触发即输出 YAML', () => {
    expect(transform({ text: 'go' }, base)).toContain('image: node:20')
  })

  it('超长输入抛错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })
})
