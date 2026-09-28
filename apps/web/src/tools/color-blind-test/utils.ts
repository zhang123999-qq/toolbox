/**
 * color-blind-test —— 色盲测试的纯函数层
 *
 * 伪等色图点阵数据为纯函数生成（mulberry32 种子随机）；
 * canvas 绘制只在 Tool.tsx 中。
 */

/** 测试图序列 */
export const PLATES: { digit: string; label: string }[] = [
  { digit: '12', label: '第一图' },
  { digit: '6', label: '第二图' },
  { digit: '74', label: '第三图' },
  { digit: '2', label: '第四图' },
  { digit: '5', label: '第五图' },
]

/** 数字色点 / 背景色点 */
export const DIGIT_COLOR = '#c25e3a'
export const BG_COLOR = '#7d9b6a'

/** 5×7 点阵数字字体 */
const FONT: Record<string, string[]> = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
}

/** 伪等色图圆点 */
export interface IshiharaDot {
  x: number
  y: number
  r: number
  /** 是否为数字笔画上的点 */
  isDigit: boolean
}

/** 种子随机数（mulberry32） */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 归一化坐标 (nx, ny ∈ [0,1)) 是否落在数字笔画上。
 * 多位数字横向排列，字间距 1 列。
 */
function isInDigit(digit: string, nx: number, ny: number): boolean {
  const COLS = 5
  const ROWS = 7
  const STEP = COLS + 1
  const gx = nx * (digit.length * STEP - 1)
  const di = Math.floor(gx / STEP)
  const inChar = gx - di * STEP
  if (inChar >= COLS) return false // 落在字间距
  const col = Math.floor(inChar)
  const row = Math.floor(ny * ROWS)
  return FONT[digit[di]][row][col] === '1'
}

/**
 * 生成伪等色图点阵：44×44 圆点，数字笔画用数字色、其余用背景色，
 * 圆心与半径带种子抖动。
 */
export function genIshiharaPlate(digit: string, seed: number): IshiharaDot[] {
  if (!/^[0-9]+$/.test(digit)) {
    throw new Error('色盲图仅支持数字')
  }
  const rand = mulberry32(seed)
  const dots: IshiharaDot[] = []
  const N = 44
  for (let gy = 0; gy < N; gy++) {
    for (let gx = 0; gx < N; gx++) {
      dots.push({
        x: gx + rand() * 0.7,
        y: gy + rand() * 0.7,
        r: 0.55 + rand() * 0.45,
        isDigit: isInDigit(digit, gx / N, gy / N),
      })
    }
  }
  return dots
}

/** 计分：答案去空格后与标准答案比对 */
export function scorePlates(
  answers: string[],
  plates: { digit: string }[] = PLATES,
): { correct: number; total: number } {
  let correct = 0
  for (let i = 0; i < plates.length; i++) {
    if ((answers[i] ?? '').trim() === plates[i].digit) correct++
  }
  return { correct, total: plates.length }
}

/** 色觉筛查结果文案（仅供参考） */
export function gradeColorBlind(correct: number, total: number): string {
  if (total <= 0) return '无数据'
  const rate = correct / total
  if (rate >= 0.8) return '色觉正常'
  if (rate >= 0.5) return '可能存在轻微色觉异常'
  return '建议到医院眼科做进一步检查'
}
