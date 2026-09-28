/**
 * sensor —— 设备传感器读数的纯函数层
 *
 * DeviceMotionEvent / DeviceOrientationEvent 的事件对象经参数注入（可为字面 mock）；
 * 加速度解析、合成加速度、倾斜角换算均为纯函数；
 * iOS 权限申请经构造器参数注入。
 * 无事件数据时各字段为 null，组件展示"未知"。
 */

/** 三轴加速度（m/s²，缺失为 null） */
export interface Accel {
  readonly x: number | null
  readonly y: number | null
  readonly z: number | null
}

/** DeviceMotionEvent 子集 */
export interface MotionEventLike {
  readonly accelerationIncludingGravity?: Accel | null
}

/** DeviceOrientationEvent 子集 */
export interface OrientationEventLike {
  readonly alpha: number | null
  readonly beta: number | null
  readonly gamma: number | null
}

/** 倾斜角：pitch 为前后倾（beta），roll 为左右倾（gamma），单位度 */
export interface Tilt {
  readonly pitch: number | null
  readonly roll: number | null
}

/** 解析运动事件中的含重力加速度；事件或字段缺失时对应项为 null */
export function readMotion(ev?: MotionEventLike | null): Accel {
  const a = ev?.accelerationIncludingGravity
  return { x: a?.x ?? null, y: a?.y ?? null, z: a?.z ?? null }
}

/** 合成加速度（各轴平方和开方）；null 轴按 0 处理 */
export function motionMagnitude(a: Accel): number {
  const x = a.x ?? 0
  const y = a.y ?? 0
  const z = a.z ?? 0
  return Math.sqrt(x * x + y * y + z * z)
}

/** 方向事件 → 倾斜角；beta 为前后倾，gamma 为左右倾 */
export function tiltFromOrientation(o?: OrientationEventLike | null): Tilt {
  return { pitch: o?.beta ?? null, roll: o?.gamma ?? null }
}

function formatAxis(v: number | null, unit: string): string {
  return v == null ? '未知' : `${v.toFixed(2)} ${unit}`
}

/** 加速度中文格式化 */
export function formatAccel(a: Accel): string {
  return `X ${formatAxis(a.x, 'm/s²')}，Y ${formatAxis(a.y, 'm/s²')}，Z ${formatAxis(a.z, 'm/s²')}`
}

/** 倾斜角中文格式化 */
export function formatTilt(t: Tilt): string {
  return `前后倾 ${formatAxis(t.pitch, '°')}，左右倾 ${formatAxis(t.roll, '°')}`
}

/** iOS 权限申请构造器子集 */
export interface MotionRequestorLike {
  requestPermission?: () => Promise<string>
}

/**
 * 申请运动传感器权限。iOS 上 DeviceMotionEvent.requestPermission 存在时调用；
 * 其他平台无需申请，返回 'not-required'。
 */
export async function requestMotionPermission(ctor?: MotionRequestorLike | null): Promise<string> {
  if (ctor != null && typeof ctor.requestPermission === 'function') {
    return ctor.requestPermission()
  }
  return 'not-required'
}
