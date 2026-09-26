import { describe, expect, it } from 'vitest'
import type { DockerConfigOptions } from './schema'
import { transform } from './utils'

const base: DockerConfigOptions = {
  baseImage: 'node',
  version: '',
  workdir: '',
  port: '',
  command: '',
}

describe('docker-config / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('默认 node 镜像带 alpine 版本', () => {
    const out = transform({ text: 'x' }, base)
    expect(out).toContain('FROM node:20-alpine')
    expect(out).toContain('WORKDIR /app')
    expect(out).toContain('EXPOSE 3000')
    expect(out).toContain('CMD node server.js')
  })

  it('自定义版本/工作目录/端口/命令', () => {
    const out = transform(
      { text: 'x' },
      {
        baseImage: 'python',
        version: '3.11',
        workdir: '/srv',
        port: '8000',
        command: 'uvicorn main:app',
      },
    )
    expect(out).toContain('FROM python:3.11')
    expect(out).toContain('WORKDIR /srv')
    expect(out).toContain('EXPOSE 8000')
    expect(out).toContain('CMD uvicorn main:app')
  })

  it('golang/openjdk 默认版本正确', () => {
    expect(transform({ text: 'x' }, { ...base, baseImage: 'golang' })).toContain(
      'FROM golang:1.22-alpine',
    )
    expect(transform({ text: 'x' }, { ...base, baseImage: 'openjdk' })).toContain(
      'FROM openjdk:21-jre',
    )
  })

  it('包含 COPY 指令', () => {
    expect(transform({ text: 'x' }, base)).toContain('COPY . .')
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })

  it('拒绝 tag/命令中的换行注入', () => {
    expect(() => transform({ text: 'x' }, { ...base, version: 'alpine\nUSER root' })).toThrow(/tag/)
    expect(() => transform({ text: 'x' }, { ...base, command: 'node a\nRUN evil' })).toThrow(/CMD/)
  })

  it('workdir 必须绝对路径且端口在范围内', () => {
    expect(() => transform({ text: 'x' }, { ...base, workdir: 'rel/path' })).toThrow(/绝对路径/)
    expect(() => transform({ text: 'x' }, { ...base, port: '70000' })).toThrow(/1-65535/)
    expect(() => transform({ text: 'x' }, { ...base, port: 'abc' })).toThrow(/数字/)
  })
})
