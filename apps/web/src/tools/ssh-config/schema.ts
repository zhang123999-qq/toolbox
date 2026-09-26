import { z } from 'zod'

/** 输入契约：输入框只作触发用，内容不参与配置 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：每个字段对应一条 ssh_config 指令 */
export const optionsSchema = z.object({
  host: z.string(),
  hostname: z.string(),
  port: z.string(),
  user: z.string(),
  identityFile: z.string(),
  proxyJump: z.string(),
  forwardAgent: z.boolean(),
})

export type SshConfigInput = z.infer<typeof inputSchema>
export type SshConfigOptions = z.infer<typeof optionsSchema>
