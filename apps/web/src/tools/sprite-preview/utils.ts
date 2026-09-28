/**
 * sprite-preview —— 全局编号 #799
 * 域：game（游戏开发）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 *
 * 精灵图预览：
 * validateFrames 校验帧列表与 fps；buildPreviewPlayer 构建纯逻辑播放器
 * （frameAt 按毫秒定位帧；play/pause/toggle 状态机；advance 按调用方传入的
 * 经过时间推进游标并返回当前帧，时间不依赖真实时钟以便测试）；
 * colorForSprite 按 spriteId 哈希生成稳定的占位配色（组件层绘制用）。
 * 空帧/非法 fps 中文报错。canvas 绘制只在组件层。无任何运行时依赖。
 */

export interface PreviewPlayerOptions {
  /** 帧的精灵 id 列表（不能为空） */
  frames: string[]
  /** 每秒帧数，1~120 */
  fps: number
  loop: boolean
}

export interface PreviewPlayer {
  readonly frames: string[]
  readonly fps: number
  readonly loop: boolean
  /** 单帧时长毫秒 */
  readonly frameDurationMs: number
  /** 总时长毫秒 */
  readonly totalMs: number
  /** 按毫秒定位当前帧索引 */
  frameAt(tMs: number): number
  /** 是否正在播放 */
  isPlaying(): boolean
  play(): void
  pause(): void
  toggle(): void
  /** 推进游标（仅播放中生效），返回当前帧索引 */
  advance(elapsedMs: number): number
  /** 游标归零 */
  reset(): void
  /** 当前游标毫秒 */
  cursorMs(): number
}

/** 校验帧列表：非空数组且每项为非空字符串 */
export function validateFrames(frames: string[]): void {
  if (!Array.isArray(frames) || frames.length === 0) throw new Error('没有帧可预览')
  for (const f of frames) {
    if (typeof f !== 'string' || f.trim() === '') throw new Error('帧 spriteId 不能为空')
  }
}

function validateFps(fps: number): void {
  if (!Number.isInteger(fps) || fps < 1 || fps > 120) {
    throw new Error('fps 须为 1~120 的正整数')
  }
}

/** 按 spriteId 哈希生成稳定的 HSL 占位配色 */
export function colorForSprite(spriteId: string): string {
  let h = 0
  for (let i = 0; i < spriteId.length; i += 1) {
    h = (h * 31 + spriteId.charCodeAt(i)) >>> 0
  }
  return `hsl(${h % 360}, 65%, 55%)`
}

/** 构建纯逻辑预览播放器 */
export function buildPreviewPlayer(opts: PreviewPlayerOptions): PreviewPlayer {
  validateFrames(opts.frames)
  validateFps(opts.fps)
  const frames = opts.frames.map((f) => f.trim())
  const frameDurationMs = 1000 / opts.fps
  const totalMs = frames.length * frameDurationMs
  let playing = false
  let cursor = 0

  function frameAt(tMs: number): number {
    const t = tMs < 0 ? 0 : tMs
    const c = opts.loop ? t % totalMs : Math.min(t, totalMs - frameDurationMs / 2)
    const idx = Math.floor(c / frameDurationMs)
    return Math.min(idx, frames.length - 1)
  }

  return {
    frames,
    fps: opts.fps,
    loop: opts.loop,
    frameDurationMs,
    totalMs,
    frameAt,
    isPlaying: () => playing,
    play: () => {
      playing = true
    },
    pause: () => {
      playing = false
    },
    toggle: () => {
      playing = !playing
    },
    advance: (elapsedMs: number) => {
      if (playing) cursor += Math.max(0, elapsedMs)
      return frameAt(cursor)
    },
    reset: () => {
      cursor = 0
    },
    cursorMs: () => cursor,
  }
}
