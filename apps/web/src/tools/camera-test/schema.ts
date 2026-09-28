import { z } from 'zod'

/**
 * 输入契约：摄像头测试为纯交互工具，无文本输入、无选项，
 * 全部交互（枚举设备/申请权限/切换分辨率）在输出面板内完成。
 */
export const inputSchema = z.object({
  text: z.string(),
})

export const optionsSchema = z.object({})

export type CameraTestInput = z.infer<typeof inputSchema>
export type CameraTestOptions = z.infer<typeof optionsSchema>
