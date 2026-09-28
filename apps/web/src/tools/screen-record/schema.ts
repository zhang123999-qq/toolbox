import { z } from 'zod'

/** 选项契约：codec=视频编码偏好（auto 按候选顺序探测）；audio=是否录制系统音频 */
export const optionsSchema = z.object({
  codec: z.enum(['auto', 'vp9', 'vp8']),
  audio: z.enum(['on', 'off']),
})

export type ScreenRecordOptions = z.infer<typeof optionsSchema>

/** 无文件输入：采集来自 getDisplayMedia 的屏幕流，不经过 zod 文本校验 */
export const inputSchema = z.object({})
