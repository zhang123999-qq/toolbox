import { describe, expect, it } from 'vitest'
import type { TerraformConfigOptions } from './schema'
import { transform } from './utils'

const base: TerraformConfigOptions = { provider: 'aws', resource: 'compute' }

describe('terraform-config / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('AWS compute 输出三文件', () => {
    const out = transform({ text: 'x' }, base)
    expect(out).toContain('# ---- main.tf ----')
    expect(out).toContain('resource "aws_instance" "app"')
    expect(out).toContain('# ---- variables.tf ----')
    expect(out).toContain('# ---- outputs.tf ----')
    expect(out).toContain('output "instance_ip"')
  })

  it('Azure storage 用 azurerm', () => {
    const out = transform({ text: 'x' }, { provider: 'azure', resource: 'storage' })
    expect(out).toContain('azurerm_resource_group')
    expect(out).toContain('features {}')
  })

  it('Google 带 project 变量', () => {
    const out = transform({ text: 'x' }, { provider: 'google', resource: 'network' })
    expect(out).toContain('variable "project"')
    expect(out).toContain('google_compute_network')
  })

  it('AWS network 输出 vpc', () => {
    expect(transform({ text: 'x' }, { provider: 'aws', resource: 'network' })).toContain(
      'resource "aws_vpc" "main"',
    )
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })
})
