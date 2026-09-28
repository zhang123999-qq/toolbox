/**
 * r2-config（#809）utils 单测：桶名 / 绑定名校验与 TOML 片段生成。
 */
import { describe, expect, it } from 'vitest'
import { buildR2Config, validateBucketName, validateR2Binding } from './utils'

describe('validateR2Binding', () => {
  it('合法绑定名通过', () => {
    expect(() => validateR2Binding('BUCKET')).not.toThrow()
  })
  it('空绑定名抛错', () => {
    expect(() => validateR2Binding('')).toThrow('绑定名不能为空')
  })
  it('非法标识符抛错', () => {
    expect(() => validateR2Binding('my-bucket')).toThrow('合法 JS 标识符')
  })
})

describe('validateBucketName', () => {
  it('合法桶名通过', () => {
    expect(() => validateBucketName('my-bucket-1', '存储桶名称')).not.toThrow()
    expect(() => validateBucketName('a.b-c', '存储桶名称')).not.toThrow()
  })
  it('空桶名抛错', () => {
    expect(() => validateBucketName('  ', '存储桶名称')).toThrow('存储桶名称不能为空')
  })
  it('长度非法抛错', () => {
    expect(() => validateBucketName('ab', '存储桶名称')).toThrow('3–63 个字符')
    expect(() => validateBucketName('a'.repeat(64), '存储桶名称')).toThrow('3–63 个字符')
  })
  it('大写/首尾连字符抛错', () => {
    expect(() => validateBucketName('MyBucket', '存储桶名称')).toThrow('只能包含小写字母')
    expect(() => validateBucketName('-bucket', '存储桶名称')).toThrow('只能包含小写字母')
    expect(() => validateBucketName('bucket-', '存储桶名称')).toThrow('只能包含小写字母')
  })
  it('连续点抛错', () => {
    expect(() => validateBucketName('my..bucket', '存储桶名称')).toThrow('连续的点')
  })
})

describe('buildR2Config', () => {
  it('生成基本片段', () => {
    const toml = buildR2Config({ bucketName: 'my-bucket', binding: 'BUCKET' })
    expect(toml).toContain('[[r2_buckets]]')
    expect(toml).toContain('binding = "BUCKET"')
    expect(toml).toContain('bucket_name = "my-bucket"')
    expect(toml).not.toContain('preview_bucket_name')
  })
  it('带预览桶', () => {
    const toml = buildR2Config({
      bucketName: 'my-bucket',
      binding: 'BUCKET',
      previewBucketName: 'my-bucket-preview',
    })
    expect(toml).toContain('preview_bucket_name = "my-bucket-preview"')
  })
  it('预览桶非法抛错', () => {
    expect(() =>
      buildR2Config({ bucketName: 'my-bucket', binding: 'BUCKET', previewBucketName: 'Bad' }),
    ).toThrow('预览存储桶名称只能包含小写字母')
  })
  it('绑定名非法抛错', () => {
    expect(() => buildR2Config({ bucketName: 'my-bucket', binding: 'my-bucket' })).toThrow(
      '合法 JS 标识符',
    )
  })
  it('桶名非法抛错', () => {
    expect(() => buildR2Config({ bucketName: '', binding: 'BUCKET' })).toThrow('存储桶名称不能为空')
  })
})
