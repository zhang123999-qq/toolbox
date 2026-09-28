/**
 * animation-frame —— 全局编号 #797
 * 域：game（游戏开发）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 *
 * 动画帧：
 * AnimationClip 为帧序列（每帧 {spriteId, durationMs}）加循环开关；
 * addFrame / removeFrame / reorderFrames 为不可变纯函数；
 * totalDuration 累计时长；frameAtTime 按毫秒定位当前帧（循环时取模，
 * 非循环钳制到末帧）；exportClipJson / importClipJson 序列化（中文报错）。
 * 非法时长/空 spriteId/越界索引中文报错。无任何运行时依赖。
 */

export interface ClipFrame {
  spriteId: string
  /** 单帧时长毫秒，1~60000 的正整数 */
  durationMs: number
}

export interface AnimationClip {
  name: string
  frames: ClipFrame[]
  loop: boolean
}

function isPositiveInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n > 0
}

function validateFrame(frame: ClipFrame): void {
  if (typeof frame !== 'object' || frame === null) throw new Error('帧必须是对象')
  if (typeof frame.spriteId !== 'string' || frame.spriteId.trim() === '') {
    throw new Error('帧的 spriteId 不能为空')
  }
  if (frame.spriteId.length > 100) throw new Error('spriteId 超过 100 字符上限')
  if (!isPositiveInt(frame.durationMs) || frame.durationMs > 60000) {
    throw new Error('帧时长须为 1~60000 毫秒的正整数')
  }
}

function validateIndex(clip: AnimationClip, index: number, label: string): void {
  if (!Number.isInteger(index) || index < 0 || index >= clip.frames.length) {
    throw new Error(`${label}越界：${String(index)}`)
  }
}

/** 创建空片段 */
export function createClip(name = '未命名动画'): AnimationClip {
  if (typeof name !== 'string' || name.trim() === '') throw new Error('片段名称不能为空')
  return { name: name.trim(), frames: [], loop: true }
}

/** 追加一帧（返回新片段） */
export function addFrame(clip: AnimationClip, frame: ClipFrame): AnimationClip {
  validateFrame(frame)
  return { ...clip, frames: [...clip.frames, { spriteId: frame.spriteId.trim(), durationMs: frame.durationMs }] }
}

/** 删除指定索引的帧（返回新片段） */
export function removeFrame(clip: AnimationClip, index: number): AnimationClip {
  validateIndex(clip, index, '删除索引')
  return { ...clip, frames: clip.frames.filter((_, i) => i !== index) }
}

/** 移动帧：把 from 位置的帧移到 to 位置（返回新片段） */
export function reorderFrames(clip: AnimationClip, from: number, to: number): AnimationClip {
  validateIndex(clip, from, '源索引')
  if (!Number.isInteger(to) || to < 0 || to >= clip.frames.length) {
    throw new Error(`目标索引越界：${String(to)}`)
  }
  if (from === to) return clip
  const frames = [...clip.frames]
  const [moved] = frames.splice(from, 1)
  frames.splice(to, 0, moved)
  return { ...clip, frames }
}

/** 总时长（毫秒） */
export function totalDuration(clip: AnimationClip): number {
  return clip.frames.reduce((sum, f) => sum + f.durationMs, 0)
}

/**
 * 按毫秒定位当前帧索引。空片段报错；负时间按 0 处理；
 * loop 为 true 时取模循环，false 时钳制到末帧。
 */
export function frameAtTime(clip: AnimationClip, tMs: number): number {
  if (clip.frames.length === 0) throw new Error('动画片段没有帧')
  const total = totalDuration(clip)
  const t = tMs < 0 ? 0 : tMs
  const cursor = clip.loop ? t % total : Math.min(t, total - 1)
  let idx = clip.frames.length - 1
  let acc = 0
  for (let i = 0; i < clip.frames.length; i += 1) {
    acc += clip.frames[i].durationMs
    if (cursor < acc) {
      idx = i
      break
    }
  }
  return idx
}

/** 导出 JSON */
export function exportClipJson(clip: AnimationClip): string {
  return JSON.stringify(clip, null, 2)
}

/** 导入 JSON（严格校验） */
export function importClipJson(json: string): AnimationClip {
  let parsed: unknown
  try {
    parsed = JSON.parse(json) as unknown
  } catch {
    throw new Error('JSON 解析失败')
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('动画片段必须是对象')
  }
  const obj = parsed as Record<string, unknown>
  if (typeof obj.name !== 'string' || obj.name.trim() === '') throw new Error('片段名称不能为空')
  if (!Array.isArray(obj.frames)) throw new Error('frames 必须是数组')
  for (const f of obj.frames) validateFrame(f as ClipFrame)
  if (typeof obj.loop !== 'boolean') throw new Error('loop 必须是布尔值')
  return {
    name: obj.name.trim(),
    frames: (obj.frames as ClipFrame[]).map((f) => ({
      spriteId: f.spriteId.trim(),
      durationMs: f.durationMs,
    })),
    loop: obj.loop,
  }
}
