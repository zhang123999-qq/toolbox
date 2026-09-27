import { z } from 'zod'

/** 输入契约：text=名单（每行一人，空行忽略） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：groups=分组数（正整数，合法性由 utils 校验并给出双语报错） */
export const optionsSchema = z.object({
  groups: z.string().max(10, '分组数过长'),
})

export type RandomGroupInput = z.infer<typeof inputSchema>
export type RandomGroupOptions = z.infer<typeof optionsSchema>
