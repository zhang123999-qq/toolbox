/**
 * kv-config（#807）utils 单测：绑定名 / ID 校验与 TOML 片段生成。
 */
import { describe, expect, it } from 'vitest'
import { buildKvConfig, EXAMPLE_KV_ID, validateKvBinding, validateKvId } from './utils'

describe('validateKvBinding', () => {
  it('合法绑定名通过', () => {
    expect(() => validateKvBinding('MY_KV')).not.toThrow()
    expect(() => validateKvBinding('$store')).not.toThrow()
  })
  it('空绑定名抛错', () => {
    expect(() => validateKvBinding('  ')).toThrow('绑定名不能为空')
  })
  it('非法标识符抛错', () => {
    expect(() => validateKvBinding('my-kv')).toThrow('合法 JS 标识符')
    expect(() => validateKvBinding('1kv')).toThrow('合法 JS 标识符')
  })
})

describe('validateKvId', () => {
  it('32 位十六进制通过', () => {
    expect(() => validateKvId(EXAMPLE_KV_ID, '命名空间 ID')).not.toThrow()
  })
  it('空 ID 抛错', () => {
    expect(() => validateKvId('', '命名空间 ID')).toThrow('命名空间 ID不能为空')
  })
  it('长度/字符非法抛错', () => {
    expect(() => validateKvId('abc', '命名空间 ID')).toThrow('32 位十六进制')
    expect(() => validateKvId('z'.repeat(32), '命名空间 ID')).toThrow('32 位十六进制')
  })
})

describe('buildKvConfig', () => {
  it('生成基本片段', () => {
    const toml = buildKvConfig({ binding: 'MY_KV', id: EXAMPLE_KV_ID })
    expect(toml).toContain('[[kv_namespaces]]')
    expect(toml).toContain('binding = "MY_KV"')
    expect(toml).toContain(`id = "${EXAMPLE_KV_ID}"`)
    expect(toml).not.toContain('preview_id')
  })
  it('带 preview_id', () => {
    const toml = buildKvConfig({ binding: 'MY_KV', id: EXAMPLE_KV_ID, previewId: EXAMPLE_KV_ID })
    expect(toml).toContain(`preview_id = "${EXAMPLE_KV_ID}"`)
  })
  it('preview_id 非法抛错', () => {
    expect(() => buildKvConfig({ binding: 'MY_KV', id: EXAMPLE_KV_ID, previewId: 'bad' })).toThrow(
      '预览命名空间 ID应为 32 位十六进制',
    )
  })
  it('绑定名非法抛错', () => {
    expect(() => buildKvConfig({ binding: 'my-kv', id: EXAMPLE_KV_ID })).toThrow('合法 JS 标识符')
  })
  it('ID 非法抛错', () => {
    expect(() => buildKvConfig({ binding: 'MY_KV', id: '' })).toThrow('命名空间 ID不能为空')
  })
})
