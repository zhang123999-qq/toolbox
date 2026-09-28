/**
 * video-merge —— 视频合并的纯函数层
 *
 * 约定：ffmpeg 调用只出现在 Tool.tsx（动态 import('@ffmpeg/ffmpeg')），
 * 本文件只做文件清单校验 / concat 列表拼装 / 参数拼装 / 报告，可在 node 下被 vitest 完整测试。
 */

// ---------------------------------------------------------------------------
// 文件清单
// ---------------------------------------------------------------------------

/** 单文件上限 500 MiB */
export const MAX_FILE_BYTES = 500 * 1024 * 1024

/** 至少 2 个视频才能合并；空清单 / 单个都抛中文错 */
export function validateFileList(count: number): void {
  if (!Number.isInteger(count) || count < 2) {
    throw new Error(`至少需要 2 个视频才能合并，当前只有 ${count} 个`)
  }
}

/** 逐个检查文件大小，超限抛中文错 */
export function validateFileSizes(sizes: readonly number[]): void {
  for (let i = 0; i < sizes.length; i++) {
    const size = sizes[i]!
    if (!Number.isFinite(size) || size < 0) throw new Error(`第 ${i + 1} 个文件大小非法`)
    if (size > MAX_FILE_BYTES) {
      throw new Error(
        `第 ${i + 1} 个文件过大：${formatBytes(size)}，超过 ${formatBytes(MAX_FILE_BYTES)} 上限`,
      )
    }
    if (size === 0) throw new Error(`第 ${i + 1} 个文件为空`)
  }
}

/** 字节数 → 人类可读（B / KiB / MiB / GiB） */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) throw new Error(`字节数非法：${String(bytes)}`)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KiB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GiB`
}

// ---------------------------------------------------------------------------
// concat 列表与 ffmpeg 参数（纯函数，实际调用在 Tool.tsx）
// ---------------------------------------------------------------------------

/** 转义 concat 列表中的单引号：' → '\'' */
export function escapeConcatName(name: string): string {
  return name.replace(/'/g, "'\\''")
}

/** 生成 ffmpeg concat demuxer 的列表文件内容 */
export function buildConcatList(fileNames: readonly string[]): string {
  return fileNames.map((name) => `file '${escapeConcatName(name)}'`).join('\n') + '\n'
}

/**
 * 拼装合并命令参数。
 * reencode=true：全部重编码为 H.264 + AAC，解决多视频编码 / 分辨率不一致导致的拼接失败；
 * reencode=false：流拷贝拼接，速度快，要求各视频编码参数一致。
 */
export function buildMergeArgs(listName: string, outputName: string, reencode: boolean): string[] {
  const base = ['-f', 'concat', '-safe', '0', '-i', listName]
  if (reencode) {
    return [...base, '-c:v', 'libx264', '-preset', 'veryfast', '-c:a', 'aac', outputName]
  }
  return [...base, '-c', 'copy', outputName]
}

/** 合并结果的文件名：固定 merged.mp4 */
export function mergeFileName(): string {
  return 'merged.mp4'
}

/** 合并报告：片段清单 + 模式 + 总大小 */
export function buildMergeReport(
  names: readonly string[],
  reencode: boolean,
  outputBytes: number,
): string {
  const lines = names.map((name, i) => `${i + 1}. ${name}`)
  return [
    `已按顺序合并 ${names.length} 个视频：`,
    ...lines,
    `模式：${reencode ? '重编码（H.264 + AAC，编码已统一）' : '流拷贝（要求各视频编码一致）'}`,
    `输出：merged.mp4（${formatBytes(outputBytes)}）`,
  ].join('\n')
}
