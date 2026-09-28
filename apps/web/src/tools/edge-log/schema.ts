import { z } from 'zod'

/** 主输入：query 模式下可留空；parse 模式下为待解析的日志文本（多行） */
export const inputSchema = z.object({
  text: z.string().max(20000, '输入超过 20000 字符上限'),
})

export type EdgeLogInput = z.infer<typeof inputSchema>

/** 选项：mode=query 构造查询；mode=parse 解析日志行 */
export const optionsSchema = z.object({
  mode: z.enum(['query', 'parse']),
  startTime: z.string(),
  endTime: z.string(),
  status: z.string(),
  colo: z.string(),
})

export type EdgeLogOptions = z.infer<typeof optionsSchema>
