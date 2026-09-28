import { z } from 'zod'

/** 主输入：瓦片地图 JSON（导入用）；新建时也可用文本指定参数 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200000 字符上限'),
})

export type TilemapToolInput = z.infer<typeof inputSchema>
