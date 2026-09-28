import { z } from 'zod'

/** 排序：dirs-first 目录优先 / alpha 纯字母 */
export const sortModeSchema = z.enum(['dirs-first', 'alpha'])

export const optionsSchema = z.object({
  maxDepth: z.number().int().min(1).max(20),
  showHidden: z.boolean(),
  sortMode: sortModeSchema,
})

export type SortMode = z.infer<typeof sortModeSchema>
export type DirectoryTreeOptions = z.infer<typeof optionsSchema>
