import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { PhysicsToolInput } from './schema'
import {
  circularMotion,
  elasticCollision,
  fallTime,
  formatPhysicsResult,
  frictionStop,
  jumpVelocity,
  projectile,
} from './utils'

const BTN_CLS =
  'rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500'
const PRE_CLS =
  'max-h-80 overflow-auto rounded bg-slate-50 p-3 font-mono text-xs break-all whitespace-pre-wrap dark:bg-slate-900'

type Mode = 'projectile' | 'fall' | 'jump' | 'friction' | 'collision' | 'circular'

const MODES: Array<{ key: Mode; label: string; hint: string }> = [
  { key: 'projectile', label: '斜抛', hint: '{"v0":10,"angleDeg":45,"g":9.8}' },
  { key: 'fall', label: '自由落体', hint: '{"h":4.9,"g":9.8}' },
  { key: 'jump', label: '跳跃初速', hint: '{"h":1.2,"g":9.8}' },
  { key: 'friction', label: '摩擦滑行', hint: '{"v0":10,"mu":0.5,"g":9.8}' },
  { key: 'collision', label: '弹性碰撞', hint: '{"m1":1,"v1":5,"m2":1,"v2":-3}' },
  { key: 'circular', label: '圆周运动', hint: '{"v":10,"r":5}' },
]

export default function Tool() {
  const [mode, setMode] = useState<Mode>('projectile')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  function handleCalc(input: PhysicsToolInput): void {
    setError('')
    setOutput('')
    try {
      let raw: unknown
      try {
        raw = JSON.parse(input.text)
      } catch {
        throw new Error('输入不是合法 JSON')
      }
      const o = raw as Record<string, number>
      switch (mode) {
        case 'projectile': {
          const r = projectile({ v0: o.v0, angleDeg: o.angleDeg, g: o.g })
          setOutput(formatPhysicsResult('斜抛运动', { 射程: r.range, 最大高度: r.maxHeight, 飞行时间: r.flightTime }, 'm/s'))
          break
        }
        case 'fall': {
          setOutput(formatPhysicsResult('自由落体', { 下落时间: fallTime(o.h, o.g) }, 's'))
          break
        }
        case 'jump': {
          setOutput(formatPhysicsResult('跳跃初速', { 所需初速度: jumpVelocity(o.h, o.g) }, 'm/s'))
          break
        }
        case 'friction': {
          const r = frictionStop({ v0: o.v0, mu: o.mu, g: o.g })
          setOutput(formatPhysicsResult('摩擦滑行', { 滑行距离: r.distance, 停止时间: r.time }, 'm/s'))
          break
        }
        case 'collision': {
          const r = elasticCollision({ m1: o.m1, v1: o.v1, m2: o.m2, v2: o.v2 })
          setOutput(formatPhysicsResult('弹性碰撞后速度', { v1: r.v1p, v2: r.v2p }, 'm/s'))
          break
        }
        case 'circular': {
          const r = circularMotion(o.v, o.r)
          setOutput(formatPhysicsResult('圆周运动', { 向心加速度: r.centripetal, 周期: r.period }, 'm/s²/s'))
          break
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  const hint = MODES.find((m) => m.key === mode)?.hint ?? ''

  return (
    <MultiPanel<PhysicsToolInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: MODES[0].hint }}
      initialOptions={{}}
      example={{ text: MODES[0].hint }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                data-testid={`physics-mode-${m.key}`}
                onClick={() => setMode(m.key)}
                className={m.key === mode ? BTN_CLS : 'rounded border border-slate-300 px-4 py-1.5 text-sm dark:border-slate-600'}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
            参数示例：{hint}
          </p>
          <div>
            <button
              type="button"
              data-testid="physics-calc"
              onClick={() => handleCalc(input)}
              className={BTN_CLS}
            >
              计算
            </button>
          </div>
          {error !== '' && (
            <p data-testid="physics-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {output !== '' && (
            <pre data-testid="physics-output" className={PRE_CLS}>
              {output}
            </pre>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：g 为重力加速度（m/s²），默认 9.8；角度单位为度。纯本地计算，不发送网络请求。
          </p>
        </div>
      )}
      toText={() => output}
    />
  )
}
