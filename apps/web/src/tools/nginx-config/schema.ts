import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  serverName: z.string(),
  listen: z.string(),
  root: z.string(),
  proxyPass: z.string(),
  ssl: z.boolean(),
  gzip: z.boolean(),
})

export type NginxConfigInput = z.infer<typeof inputSchema>
export type NginxConfigOptions = z.infer<typeof optionsSchema>
