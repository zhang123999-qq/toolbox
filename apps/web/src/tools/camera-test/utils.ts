/**
 * camera-test —— 摄像头检测的纯函数层
 *
 * 分辨率预设、约束构造、设备枚举均为纯函数（MediaDevices 可注入）；
 * getUserMedia / video 元素操作只在 Tool.tsx 中，可在 node 下被 vitest 完整测试。
 */

/** 摄像头状态机 */
export type CameraStatus = 'idle' | 'requesting' | 'active' | 'denied' | 'unsupported'

/** 状态 → 中文文案 */
export const CAMERA_STATUS_TEXT: Record<CameraStatus, string> = {
  idle: '未开始',
  requesting: '正在请求摄像头权限…',
  active: '预览中',
  denied: '摄像头权限被拒绝，请在浏览器地址栏允许后重试',
  unsupported: '当前浏览器不支持 MediaDevices，无法使用摄像头',
}

/** 分辨率预设 */
export interface ResolutionPreset {
  readonly id: string
  readonly name: string
  readonly width: number
  readonly height: number
}

export const RESOLUTION_PRESETS: readonly ResolutionPreset[] = [
  { id: 'qvga', name: 'QVGA 320×240', width: 320, height: 240 },
  { id: 'vga', name: 'VGA 640×480', width: 640, height: 480 },
  { id: 'hd', name: 'HD 720p 1280×720', width: 1280, height: 720 },
  { id: 'fhd', name: 'FHD 1080p 1920×1080', width: 1920, height: 1080 },
]

/** 按 id 取分辨率预设；未知 id 抛中文错 */
export function presetById(id: string): ResolutionPreset {
  const found = RESOLUTION_PRESETS.find((p) => p.id === id)
  if (!found) throw new Error(`未知分辨率预设：${id}`)
  return found
}

/**
 * 构造视频轨道约束。deviceId 为空字符串时不指定设备。
 */
export function buildVideoConstraints(
  preset: ResolutionPreset,
  deviceId?: string,
): MediaTrackConstraints {
  const constraints: MediaTrackConstraints = {
    width: { ideal: preset.width },
    height: { ideal: preset.height },
  }
  if (deviceId !== undefined && deviceId.trim() !== '') {
    constraints.deviceId = { exact: deviceId }
  }
  return constraints
}

/** 摄像头设备信息 */
export interface CameraDevice {
  readonly deviceId: string
  readonly label: string
}

interface EnumerateCapable {
  enumerateDevices: () => Promise<MediaDeviceInfo[]>
}

/**
 * 枚举摄像头设备。mediaDevices 可注入 mock；不支持时抛中文错。
 */
export async function listCameras(mediaDevices?: EnumerateCapable | null): Promise<CameraDevice[]> {
  if (!mediaDevices || typeof mediaDevices.enumerateDevices !== 'function') {
    throw new Error(CAMERA_STATUS_TEXT.unsupported)
  }
  const devices = await mediaDevices.enumerateDevices()
  return devices
    .filter((d) => d.kind === 'videoinput')
    .map((d) => ({ deviceId: d.deviceId, label: d.label === '' ? '摄像头' : d.label }))
}

/**
 * 申请摄像头视频流。mediaDevices 可注入 mock；不支持时抛中文错。
 */
export async function getCameraStream(
  mediaDevices: Pick<MediaDevices, 'getUserMedia'> | null | undefined,
  presetId: string,
  deviceId?: string,
): Promise<MediaStream> {
  if (!mediaDevices || typeof mediaDevices.getUserMedia !== 'function') {
    throw new Error(CAMERA_STATUS_TEXT.unsupported)
  }
  const preset = presetById(presetId)
  return mediaDevices.getUserMedia({ video: buildVideoConstraints(preset, deviceId) })
}
