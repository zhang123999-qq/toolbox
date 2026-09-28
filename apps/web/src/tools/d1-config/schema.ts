import { z } from 'zod'

/** 主输入：数据库名称 */
export const inputSchema = z.object({
  text: z.string().max(100, '输入超过 100 字符上限'),
  /** 数据库 ID（UUID） */
  databaseId: z.string().max(64, '输入超过 64 字符上限'),
  /** 绑定名 */
  binding: z.string().max(100, '输入超过 100 字符上限'),
  /** 迁移目录（可选） */
  migrationsDir: z.string().max(200, '输入超过 200 字符上限'),
  /** 示例表名 */
  tableName: z.string().max(100, '输入超过 100 字符上限'),
})

export type D1ConfigInput = z.infer<typeof inputSchema>
