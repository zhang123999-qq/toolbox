/**
 * physics（#791）utils 单测：游戏物理参数计算。
 */
import { describe, expect, it } from 'vitest'
import {
  circularMotion,
  elasticCollision,
  fallTime,
  formatPhysicsResult,
  frictionStop,
  jumpVelocity,
  projectile,
} from './utils'

describe('projectile', () => {
  it('45 度斜抛数值正确', () => {
    const r = projectile({ v0: 10, angleDeg: 45 })
    // 理论值：射程 v0²/g ≈ 10.204，最大高度 v0²/4g ≈ 2.551，时间 √2·v0/g ≈ 1.443
    expect(r.range).toBeCloseTo(10.2041, 3)
    expect(r.maxHeight).toBeCloseTo(2.551, 3)
    expect(r.flightTime).toBeCloseTo(1.4431, 3)
  })
  it('自定义重力', () => {
    const r = projectile({ v0: 10, angleDeg: 45, g: 1.62 })
    expect(r.range).toBeCloseTo(100 / 1.62, 3)
  })
  it('角度边界报错', () => {
    expect(() => projectile({ v0: 10, angleDeg: 0 })).toThrow('(0, 90)')
    expect(() => projectile({ v0: 10, angleDeg: 90 })).toThrow('(0, 90)')
    expect(() => projectile({ v0: 10, angleDeg: -5 })).toThrow('(0, 90)')
  })
  it('初速度非法报错', () => {
    expect(() => projectile({ v0: 0, angleDeg: 45 })).toThrow('正数')
    expect(() => projectile({ v0: Number.NaN, angleDeg: 45 })).toThrow('有限数字')
  })
  it('重力非法报错', () => {
    expect(() => projectile({ v0: 10, angleDeg: 45, g: 0 })).toThrow('正数')
    expect(() => projectile({ v0: 10, angleDeg: 45, g: Number.NaN })).toThrow('有限数字')
  })
})

describe('fallTime', () => {
  it('4.9 米下落约 1 秒', () => {
    expect(fallTime(4.9)).toBeCloseTo(1, 6)
  })
  it('高度非法报错', () => {
    expect(() => fallTime(0)).toThrow('正数')
    expect(() => fallTime(-3)).toThrow('正数')
  })
})

describe('jumpVelocity', () => {
  it('跳 1.225 米需约 4.9 m/s', () => {
    expect(jumpVelocity(1.225)).toBeCloseTo(4.9, 6)
  })
  it('与 fallTime 互逆', () => {
    const v = jumpVelocity(2)
    expect(v * fallTime(2)).toBeCloseTo(4, 6)
  })
  it('高度非法报错', () => {
    expect(() => jumpVelocity(0)).toThrow('正数')
  })
})

describe('frictionStop', () => {
  it('滑行距离与时间', () => {
    const { distance, time } = frictionStop({ v0: 10, mu: 0.5 })
    expect(distance).toBeCloseTo(100 / (2 * 0.5 * 9.8), 6)
    expect(time).toBeCloseTo(10 / (0.5 * 9.8), 6)
  })
  it('摩擦系数边界报错', () => {
    expect(() => frictionStop({ v0: 10, mu: 0 })).toThrow('(0, 1]')
    expect(() => frictionStop({ v0: 10, mu: 1.5 })).toThrow('(0, 1]')
  })
  it('初速度非法报错', () => {
    expect(() => frictionStop({ v0: -1, mu: 0.5 })).toThrow('正数')
  })
})

describe('elasticCollision', () => {
  it('等质量对心碰撞交换速度', () => {
    const { v1p, v2p } = elasticCollision({ m1: 1, v1: 5, m2: 1, v2: -3 })
    expect(v1p).toBeCloseTo(-3, 10)
    expect(v2p).toBeCloseTo(5, 10)
  })
  it('重球撞轻球', () => {
    const { v1p, v2p } = elasticCollision({ m1: 10, v1: 2, m2: 1, v2: 0 })
    // 动量能量守恒校验
    expect(10 * v1p + 1 * v2p).toBeCloseTo(20, 8)
    expect(10 * v1p * v1p + v2p * v2p).toBeCloseTo(40, 6)
  })
  it('质量非法报错', () => {
    expect(() => elasticCollision({ m1: 0, v1: 1, m2: 1, v2: 0 })).toThrow('m1')
    expect(() => elasticCollision({ m1: 1, v1: Number.NaN, m2: 1, v2: 0 })).toThrow('v1')
  })
})

describe('circularMotion', () => {
  it('向心加速度与周期', () => {
    const { centripetal, period } = circularMotion(10, 5)
    expect(centripetal).toBeCloseTo(20, 10)
    expect(period).toBeCloseTo(Math.PI, 10)
  })
  it('非法输入报错', () => {
    expect(() => circularMotion(0, 5)).toThrow('线速度 v')
    expect(() => circularMotion(10, -1)).toThrow('半径 r')
  })
})

describe('formatPhysicsResult', () => {
  it('格式化输出', () => {
    const s = formatPhysicsResult('斜抛', { 射程: 10.20408, 高度: 2.55 }, 'm')
    expect(s).toContain('斜抛：')
    expect(s).toContain('射程 = 10.2041 m')
  })
})
