/**
 * camera-snapshot 纯函数：支持检测、错误映射、文件名构造、镜像样式、流释放。
 * 不触碰 DOM/MediaDevices，可 100% 单测。
 */

/** 摄像头错误种类，对应 i18n 键 `cameraSnapshot.error.*` */
export type CameraErrorKind =
  'unsupported' | 'denied' | 'notfound' | 'overconstrained' | 'notready' | 'failed'

/** 是否具备摄像头 API；缺失时返回 'unsupported'，否则 null */
export function getSupportError(hasApi: boolean): CameraErrorKind | null {
  return hasApi ? null : 'unsupported'
}

/** 提取错误名：DOMException 与普通 Error 都取 name，其余取空串 */
function errorName(err: unknown): string {
  if (err instanceof DOMException) return err.name
  if (err instanceof Error) return err.name
  return ''
}

/** 把 getUserMedia 抛出的错误映射为错误种类 */
export function mapCameraError(err: unknown): 'denied' | 'notfound' | 'overconstrained' | 'failed' {
  switch (errorName(err)) {
    case 'NotAllowedError':
      return 'denied'
    case 'NotFoundError':
      return 'notfound'
    case 'OverconstrainedError':
      return 'overconstrained'
    default:
      return 'failed'
  }
}

/** 停止 MediaStream 的全部 track（切换 / 关闭 / 卸载时释放摄像头） */
export function stopAllTracks(stream: MediaStream | null): void {
  if (stream === null) return
  for (const track of stream.getTracks()) {
    track.stop()
  }
}

/** 构造输出文件名：snapshot-YYYYMMDD-HHMMSS.png；时间戳由调用方注入，便于单测 */
export function buildOutputFileName(now: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0')
  const date = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}`
  const time = `${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`
  return `snapshot-${date}-${time}.png`
}

/** 镜像预览样式：开 → 水平翻转，否则返回空字符串（不设置 transform） */
export function mirrorStyle(mirror: boolean): string {
  return mirror ? 'scaleX(-1)' : ''
}
