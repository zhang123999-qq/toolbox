/**
 * screen-test —— 屏幕测试图的纯函数层
 *
 * 测试图模式定义、样式生成、循环切换均为纯函数；
 * 全屏 API 只在 Tool.tsx 中，可在 node 下被 vitest 完整测试。
 */

/** 测试图模式 */
export interface TestPattern {
  readonly id: string
  readonly name: string
  readonly nameEn: string
  readonly hint: string
}

/** 全部测试图模式：5 纯色 + 灰阶 + 网格 + 渐变 */
export const TEST_PATTERNS: readonly TestPattern[] = [
  { id: 'red', name: '红色', nameEn: 'Red', hint: '检查红色子像素' },
  { id: 'green', name: '绿色', nameEn: 'Green', hint: '检查绿色子像素' },
  { id: 'blue', name: '蓝色', nameEn: 'Blue', hint: '检查蓝色子像素' },
  { id: 'white', name: '白色', nameEn: 'White', hint: '检查亮点与均匀性' },
  { id: 'black', name: '黑色', nameEn: 'Black', hint: '检查暗点与漏光' },
  { id: 'gray', name: '灰阶', nameEn: 'Grayscale', hint: '检查灰阶过渡与色偏' },
  { id: 'grid', name: '网格', nameEn: 'Grid', hint: '检查几何失真' },
  { id: 'gradient', name: '渐变', nameEn: 'Gradient', hint: '检查色彩断层' },
]

/** 未知模式 id 时抛中文错 */
export function getPattern(id: string): TestPattern {
  const found = TEST_PATTERNS.find((p) => p.id === id)
  if (!found) throw new Error(`未知测试图模式：${id}`)
  return found
}

/**
 * 模式 id → CSS 背景样式对象（React.CSSProperties 兼容）。
 * 未知 id 抛中文错。
 */
export function patternStyle(id: string): Record<string, string> {
  switch (id) {
    case 'red':
      return { backgroundColor: '#ff0000' }
    case 'green':
      return { backgroundColor: '#00ff00' }
    case 'blue':
      return { backgroundColor: '#0000ff' }
    case 'white':
      return { backgroundColor: '#ffffff' }
    case 'black':
      return { backgroundColor: '#000000' }
    case 'gray':
      return {
        backgroundImage:
          'linear-gradient(to right, #000000 0%, #1a1a1a 10%, #333333 20%, #4d4d4d 30%, #666666 40%, #808080 50%, #999999 60%, #b3b3b3 70%, #cccccc 80%, #e6e6e6 90%, #ffffff 100%)',
      }
    case 'grid':
      return {
        backgroundColor: '#ffffff',
        backgroundImage:
          'linear-gradient(#cccccc 1px, transparent 1px), linear-gradient(90deg, #cccccc 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }
    case 'gradient':
      return {
        backgroundImage:
          'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
      }
    default:
      throw new Error(`未知测试图模式：${id}`)
  }
}

/**
 * 循环切换到下一个模式 id。
 * @param ids 模式 id 列表（为空抛中文错）
 * @param current 当前 id（不在列表中则从第一个开始）
 */
export function cyclePattern(ids: readonly string[], current: string): string {
  if (ids.length === 0) throw new Error('模式列表为空，无法切换')
  const idx = ids.indexOf(current)
  if (idx === -1) return ids[0] as string
  return ids[(idx + 1) % ids.length] as string
}

/** 全部模式 id 列表 */
export function patternIds(): readonly string[] {
  return TEST_PATTERNS.map((p) => p.id)
}
