import { z } from 'zod'

/** 主输入：跨浏览器任务 JSON（polyfill 生成垫片 / scan 扫描代码） */
export const inputSchema = z.object({
  text: z.string().max(50000, '输入超过 50000 字符上限'),
})

export type CrossBrowserToolInput = z.infer<typeof inputSchema>
