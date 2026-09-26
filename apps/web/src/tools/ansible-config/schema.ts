import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  hosts: z.string(),
  taskName: z.string(),
  become: z.boolean(),
  installPackage: z.boolean(),
  copyFile: z.boolean(),
  startService: z.boolean(),
  manageUser: z.boolean(),
})

export type AnsibleConfigInput = z.infer<typeof inputSchema>
export type AnsibleConfigOptions = z.infer<typeof optionsSchema>
