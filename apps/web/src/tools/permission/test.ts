/**
 * permission（#776）utils 单测：权限字典与权限清单生成。
 */
import { describe, expect, it } from 'vitest'
import {
  buildPermissionsManifest,
  explainPermission,
  listPermissions,
  parsePermissionsInput,
  PERMISSIONS,
  RISK_LABELS,
} from './utils'

describe('PERMISSIONS 字典', () => {
  it('条目完整且风险等级合法', () => {
    expect(PERMISSIONS.length).toBeGreaterThan(10)
    const names = new Set<string>()
    for (const p of PERMISSIONS) {
      expect(p.name).toBeTruthy()
      expect(p.description).toBeTruthy()
      expect(Object.keys(RISK_LABELS)).toContain(p.risk)
      expect(names.has(p.name)).toBe(false)
      names.add(p.name)
    }
  })
  it('包含常见权限', () => {
    const names = PERMISSIONS.map((p) => p.name)
    for (const n of ['storage', 'tabs', 'cookies', 'scripting', 'activeTab']) {
      expect(names).toContain(n)
    }
  })
})

describe('listPermissions', () => {
  it('返回拷贝，修改不影响原字典', () => {
    const list = listPermissions()
    expect(list.length).toBe(PERMISSIONS.length)
    list[0].name = 'hacked'
    expect(PERMISSIONS[0].name).not.toBe('hacked')
  })
})

describe('explainPermission', () => {
  it('已知权限返回中文说明与风险', () => {
    const info = explainPermission('cookies')
    expect(info.description).toContain('Cookie')
    expect(info.risk).toBe('high')
    expect(RISK_LABELS[info.risk]).toBe('高风险')
  })
  it('未知权限报错', () => {
    expect(() => explainPermission('hack')).toThrow('未知权限：hack')
    expect(() => explainPermission('')).toThrow('未知权限')
  })
})

describe('buildPermissionsManifest', () => {
  it('生成权限片段 JSON', () => {
    const out = JSON.parse(
      buildPermissionsManifest({
        permissions: ['storage', 'tabs'],
        hostPermissions: ['https://api.example.com/*'],
      }),
    )
    expect(out.permissions).toEqual(['storage', 'tabs'])
    expect(out.host_permissions).toEqual(['https://api.example.com/*'])
  })
  it('hostPermissions 为空时不输出该字段', () => {
    const out = JSON.parse(
      buildPermissionsManifest({ permissions: ['storage'], hostPermissions: [] }),
    )
    expect(out.host_permissions).toBeUndefined()
    expect(out.permissions).toEqual(['storage'])
  })
  it('重复权限去重', () => {
    const out = JSON.parse(
      buildPermissionsManifest({ permissions: ['storage', 'storage'], hostPermissions: [] }),
    )
    expect(out.permissions).toEqual(['storage'])
  })
  it('未知权限报错', () => {
    expect(() => buildPermissionsManifest({ permissions: ['nope'], hostPermissions: [] })).toThrow(
      '未知权限：nope',
    )
  })
  it('空权限生成空数组', () => {
    const out = JSON.parse(buildPermissionsManifest({ permissions: [], hostPermissions: [] }))
    expect(out.permissions).toEqual([])
  })
})

describe('parsePermissionsInput', () => {
  it('合法 JSON 解析', () => {
    const o = parsePermissionsInput(
      '{"permissions":["storage"],"hostPermissions":["https://a.com/*"]}',
    )
    expect(o.permissions).toEqual(['storage'])
    expect(o.hostPermissions).toEqual(['https://a.com/*'])
  })
  it('缺省字段为空数组', () => {
    const o = parsePermissionsInput('{}')
    expect(o.permissions).toEqual([])
    expect(o.hostPermissions).toEqual([])
  })
  it('非法 JSON 报错', () => {
    expect(() => parsePermissionsInput('{')).toThrow('不是合法 JSON')
  })
  it('非对象报错', () => {
    expect(() => parsePermissionsInput('[]')).toThrow('必须是 JSON 对象')
  })
})
