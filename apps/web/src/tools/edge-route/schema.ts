import { z } from 'zod'

/** 主输入：路由规则文本（每行 pattern => target） */
export const inputSchema = z.object({
  text: z.string().max(20000, '输入超过 20000 字符上限'),
  /** 待测试的 URL */
  url: z.string().max(2000, 'URL 超过 2000 字符上限'),
})

export type EdgeRouteInput = z.infer<typeof inputSchema>

/** 选项：无（保留空对象以满足模板） */
export const optionsSchema = z.object({})

export type EdgeRouteOptions = z.infer<typeof optionsSchema>
