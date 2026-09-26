import { describe, expect, it } from 'vitest'
import type { DockerComposeOptions } from './schema'
import { transform } from './utils'

const base: DockerComposeOptions = {
  serviceName: '',
  image: '',
  ports: '',
  environment: '',
  volumes: '',
  dependsOn: '',
}

describe('docker-compose / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('最小输出一个服务', () => {
    const out = transform({ text: 'x' }, base)
    expect(out).toBe('services:\n  app:\n    image: nginx:alpine\n')
  })

  it('端口映射加引号', () => {
    const out = transform({ text: 'x' }, { ...base, ports: '3000:80, 8080:8080' })
    expect(out).toContain('    ports:\n      - "3000:80"\n      - "8080:8080"')
  })

  it('环境变量以 YAML map 形式安全输出', () => {
    const out = transform({ text: 'x' }, { ...base, environment: 'DEBUG=true\nPORT=3000' })
    expect(out).toContain('    environment:\n      DEBUG: "true"\n      PORT: "3000"')
  })

  it('卷加引号、依赖逐行', () => {
    const out = transform(
      { text: 'x' },
      { ...base, volumes: './data:/data', dependsOn: 'db, cache' },
    )
    expect(out).toContain('    volumes:\n      - "./data:/data"')
    expect(out).toContain('    depends_on:\n      - db\n      - cache')
  })

  it('自定义服务名与镜像', () => {
    const out = transform({ text: 'x' }, { ...base, serviceName: 'web', image: 'node:20' })
    expect(out).toContain('  web:\n    image: node:20')
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })

  it('拒绝服务名中的冒号/换行注入', () => {
    expect(() => transform({ text: 'x' }, { ...base, serviceName: 'a: b' })).toThrow(/服务名/)
    expect(() => transform({ text: 'x' }, { ...base, serviceName: 'a\nb: x' })).toThrow(/服务名/)
  })

  it('拒绝镜像中的换行注入', () => {
    expect(() => transform({ text: 'x' }, { ...base, image: 'x\n    privileged: true' })).toThrow(
      /镜像/,
    )
  })

  it('环境变量必须是 KEY=value，拒绝畸形/注入项', () => {
    expect(() => transform({ text: 'x' }, { ...base, environment: 'FOO' })).toThrow(/KEY=value/)
    expect(() => transform({ text: 'x' }, { ...base, environment: '- INJECTED' })).toThrow()
    expect(() => transform({ text: 'x' }, { ...base, environment: '1BAD=x' })).toThrow(/环境变量名/)
  })

  it('环境变量值含特殊字符时被双引号安全转义', () => {
    const out = transform({ text: 'x' }, { ...base, environment: 'MSG=hello: world # x' })
    expect(out).toContain('MSG: "hello: world # x"')
  })

  it('端口范围校验', () => {
    expect(() => transform({ text: 'x' }, { ...base, ports: '99999:80' })).toThrow(/1-65535/)
    expect(() => transform({ text: 'x' }, { ...base, ports: 'abc' })).toThrow(/端口格式/)
    expect(transform({ text: 'x' }, { ...base, ports: '8080:80/tcp' })).toContain('"8080:80/tcp"')
  })
})
