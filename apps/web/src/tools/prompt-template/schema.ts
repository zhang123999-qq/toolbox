import { z } from 'zod'

/**
 * 输入契约：text 为「自定义模板」（可选；填写后优先于下拉选择的内置模板，
 * 同样支持 {{变量}} 占位符）。
 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：内置模板 id（语义校验在 utils.getTemplate） */
export const optionsSchema = z.object({
  templateId: z.string().min(1, { error: '请选择一个提示词模板' }),
})

export type PromptTemplateInput = z.infer<typeof inputSchema>
export type PromptTemplateOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态 */
export interface PromptTemplateFormOptions {
  templateId: string
}
