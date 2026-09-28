import { z } from 'zod'

/** 输入契约：视频走文件入口；左侧文本区仅作备注，不进处理 */
export const inputSchema = z.object({
  text: z.string(),
})

/**
 * 选项契约：起止时间在组件里是文本框字符串（支持「83.5」「1:23.5」「1:02:03」写法），
 * 这里只做非空校验，真正的数字解析由 utils.parseTimeInput 完成并给出中文报错。
 */
export const optionsSchema = z.object({
  start: z.string().min(1, { error: '起始时间不能为空' }),
  end: z.string().min(1, { error: '结束时间不能为空' }),
  reencode: z.coerce.boolean(),
})

export type VideoCutInput = z.infer<typeof inputSchema>
export type VideoCutOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态：与 optionsSchema 同构 */
export interface VideoCutFormOptions {
  start: string
  end: string
  reencode: boolean
}
