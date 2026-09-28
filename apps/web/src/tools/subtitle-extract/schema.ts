import { z } from 'zod'

/** 输入契约：视频走文件入口；左侧文本区仅作备注，不进处理 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：输出字幕格式（组件内用中文下拉框维护，处理时再校验） */
export const optionsSchema = z.object({
  format: z.enum(['srt', 'vtt', 'ass'], { error: '输出字幕格式非法' }),
})

export type SubtitleExtractInput = z.infer<typeof inputSchema>
export type SubtitleExtractOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态：字幕格式是字符串（处理时再经 optionsSchema 校验） */
export interface SubtitleExtractFormOptions {
  format: string
}
