import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  dbType: z.union([
    z.literal('mysql'),
    z.literal('postgresql'),
    z.literal('mongodb'),
    z.literal('redis'),
    z.literal('sqlite'),
  ]),
  host: z.string().max(200, 'host 过长'),
  port: z.string().max(10, 'port 过长'),
  user: z.string().max(100, 'user 过长'),
  password: z.string().max(200, 'password 过长'),
  dbname: z.string().max(100, 'dbname 过长'),
})

export type DbConnectionInput = z.infer<typeof inputSchema>
export type DbConnectionOptions = z.infer<typeof optionsSchema>
