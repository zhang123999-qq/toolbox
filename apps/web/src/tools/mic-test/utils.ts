/**
 * mic-test —— 麦克风检测的纯函数层
 *
 * 电平计算、状态文案均为纯函数；
 * MediaDevices / AudioContext 只在 Tool.tsx 中，可注入 mock 做完整测试。
 */

/** 麦克风状态机 */
export type MicStatus = 'idle' | 'requesting' | 'active' | 'denied' | 'unsupported'

/** 状态 → 中文文案 */
export const MIC_STATUS_TEXT: Record<MicStatus, string> = {
  idle: '未开始',
  requesting: '正在请求麦克风权限…',
  active: '检测中：请对着麦克风说话',
  denied: '麦克风权限被拒绝，请在浏览器地址栏允许后重试',
  unsupported: '当前浏览器不支持 MediaDevices.getUserMedia',
}

/** 电平等级 → 中文描述 */
export function describeLevel(level: number): string {
  if (level <= 0) return '静音'
  if (level < 20) return '很弱'
  if (level < 50) return '正常'
  if (level < 80) return '较强'
  return '过载'
}

/**
 * 申请麦克风音频流。mediaDevices 可注入 mock；缺失或无 getUserMedia 时抛中文错。
 */
export async function getMicStream(
  mediaDevices?: Pick<MediaDevices, 'getUserMedia'> | null,
): Promise<MediaStream> {
  if (!mediaDevices || typeof mediaDevices.getUserMedia !== 'function') {
    throw new Error(MIC_STATUS_TEXT.unsupported)
  }
  return mediaDevices.getUserMedia({ audio: true })
}

/**
 * AnalyserNode 时域字节数据 → 0～100 电平值。
 * 时域数据以 128 为静音基准，偏离越大电平越高。
 */
export function computeLevel(data: Uint8Array): number {
  if (data.length === 0) return 0
  let sum = 0
  for (const v of data) sum += v
  const deviation = Math.abs(sum / data.length - 128) / 128
  return Math.min(100, Math.round(deviation * 200))
}

/** 电平值 → "42%" 文本 */
export function formatLevel(level: number): string {
  return `${Math.round(level)}%`
}
