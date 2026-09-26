import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  node: z.boolean(),
  python: z.boolean(),
  java: z.boolean(),
  go: z.boolean(),
  rust: z.boolean(),
  php: z.boolean(),
  ruby: z.boolean(),
  dotnet: z.boolean(),
  macos: z.boolean(),
  windows: z.boolean(),
  linux: z.boolean(),
  docker: z.boolean(),
  ide: z.boolean(),
})

export type GitignoreInput = z.infer<typeof inputSchema>
export type GitignoreOptions = z.infer<typeof optionsSchema>
