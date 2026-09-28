/**
 * level-editor —— 全局编号 #801
 * 域：game（游戏开发）｜大组：design｜优先级：P3｜可行性：A｜模板：T3
 *
 * 关卡对象层编辑（与 #788 tilemap 瓦片层绘制差异化）：
 * 在关卡中放置敌人 / 道具 / 出生点 / 出口 / 触发器等对象，
 * 校验关卡合法性（出生点唯一、出口存在、对象不越界），
 * 并导出 / 导入关卡 JSON。
 * 纯前端，无任何运行时依赖。
 */

/** 关卡对象类型 */
export const OBJECT_TYPES = ['enemy', 'item', 'spawn', 'exit', 'trigger'] as const
export type LevelObjectType = (typeof OBJECT_TYPES)[number]

export interface LevelObject {
  id: string
  type: LevelObjectType
  x: number
  y: number
  props?: Record<string, unknown>
}

export interface LevelBounds {
  width: number
  height: number
}

function requireFinite(n: unknown, name: string): asserts n is number {
  if (typeof n !== 'number' || !Number.isFinite(n)) throw new Error(`${name} 必须是有限数字`)
}

function requireNonEmptyString(s: unknown, name: string): asserts s is string {
  if (typeof s !== 'string' || s.trim() === '') throw new Error(`${name} 不能为空`)
}

function assertObjectType(t: unknown): asserts t is LevelObjectType {
  if (typeof t !== 'string' || !(OBJECT_TYPES as readonly string[]).includes(t)) {
    throw new Error(`对象类型非法，应为 ${OBJECT_TYPES.join(' / ')} 之一`)
  }
}

function assertProps(p: unknown, id: string): asserts p is Record<string, unknown> | undefined {
  if (p !== undefined && (typeof p !== 'object' || p === null || Array.isArray(p))) {
    throw new Error(`对象 "${id}" 的 props 必须是普通对象`)
  }
}

/** 构造关卡对象（含校验） */
export function makeLevelObject(
  id: string,
  type: LevelObjectType,
  x: number,
  y: number,
  props?: Record<string, unknown>,
): LevelObject {
  requireNonEmptyString(id, '对象 id')
  assertObjectType(type)
  requireFinite(x, '坐标 x')
  requireFinite(y, '坐标 y')
  assertProps(props, id)
  return props === undefined ? { id, type, x, y } : { id, type, x, y, props }
}

/** 添加对象（id 不可重复） */
export function addObject(objects: LevelObject[], obj: LevelObject): LevelObject[] {
  if (objects.some((o) => o.id === obj.id)) { throw new Error(`对象 id "${obj.id}" 已存在`) }
  return [...objects, obj]
}

/** 删除对象（id 不存在时报错） */
export function removeObject(objects: LevelObject[], id: string): LevelObject[] {
  if (!objects.some((o) => o.id === id)) throw new Error(`对象 id "${id}" 不存在`)
  return objects.filter((o) => o.id !== id)
}

/** 移动对象到新坐标 */
export function moveObject(objects: LevelObject[], id: string, x: number, y: number): LevelObject[] {
  requireFinite(x, '坐标 x')
  requireFinite(y, '坐标 y')
  let found = false
  const next = objects.map((o) => {
    if (o.id === id) {
      found = true
      return { ...o, x, y }
    }
    return o
  })
  if (!found) throw new Error(`对象 id "${id}" 不存在`)
  return next
}

function requireBounds(bounds: LevelBounds): void {
  requireFinite(bounds.width, '关卡宽度')
  requireFinite(bounds.height, '关卡高度')
  if (bounds.width <= 0 || bounds.height <= 0) throw new Error('关卡宽高必须为正数')
}

/**
 * 校验关卡：返回问题列表（空数组表示通过）。
 * 规则：出生点恰好 1 个、至少 1 个出口、所有对象不越界。
 */
export function validateLevel(objects: LevelObject[], bounds: LevelBounds): string[] {
  requireBounds(bounds)
  const issues: string[] = []
  const spawns = objects.filter((o) => o.type === 'spawn')
  if (spawns.length === 0) issues.push('缺少出生点（spawn）')
  if (spawns.length > 1) issues.push('出生点（spawn）只能有 1 个')
  if (!objects.some((o) => o.type === 'exit')) issues.push('缺少出口（exit）')
  for (const o of objects) {
    if (o.x < 0 || o.x > bounds.width || o.y < 0 || o.y > bounds.height) {
      issues.push(`对象 "${o.id}" 越界：(${o.x}, ${o.y}) 超出 ${bounds.width}×${bounds.height}`)
    }
  }
  return issues
}

/** 导出关卡 JSON */
export function exportLevelJson(objects: LevelObject[]): string {
  return JSON.stringify(objects, null, 2)
}

/** 导入关卡 JSON（含逐项校验） */
export function importLevelJson(text: string): LevelObject[] {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('输入不是合法 JSON')
  }
  if (!Array.isArray(raw)) throw new Error('关卡数据必须是对象数组')
  return raw.map((item, i) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new Error(`第 ${i + 1} 个对象不是合法对象`)
    }
    const o = item as { id?: unknown; type?: unknown; x?: unknown; y?: unknown; props?: unknown }
    return makeLevelObject(
      o.id as string,
      o.type as LevelObjectType,
      o.x as number,
      o.y as number,
      o.props as Record<string, unknown> | undefined,
    )
  })
}

/** 格式化对象列表为可读文本 */
export function formatLevelObjects(objects: LevelObject[]): string {
  if (objects.length === 0) return '关卡为空'
  return objects.map((o) => `${o.id} [${o.type}] @(${o.x}, ${o.y})`).join('\n')
}
