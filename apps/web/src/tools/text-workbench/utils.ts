import { runPipeline } from '../../lib/pipeline'
import type { TextWorkbenchInput, TextWorkbenchOptions } from './schema'

/** 可用步骤清单从 lib 转手导出：README 与测试都取这一份，避免两处维护 */
export { STEP_HELP } from '../../lib/pipeline'

/** 转义 HTML 里的标签字符 */
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** 预览：只取前 3 行，超出的用「…」带过 */
function preview(text: string, lines: number): string {
  const rows = text.split('\n')
  if (rows.length <= lines) return text
  return rows.slice(0, lines).join('\n') + '\n…（还有 ' + (rows.length - lines) + ' 行）'
}

/** 跑流水线并给出最终结果 */
export function pipelineFinal(input: TextWorkbenchInput, options: TextWorkbenchOptions): string {
  if (input.text === '') return ''
  return runPipeline(input.text, options.steps).final
}

/** 页面输出：逐个阶段列出「步骤 → 结果预览」，最后给出不认识的步骤 */
export function pipelineHtml(input: TextWorkbenchInput, options: TextWorkbenchOptions): string {
  if (input.text === '') return ''
  const result = runPipeline(input.text, options.steps)
  if (result.stages.length === 0 && result.errors.length === 0) {
    return '<p class="text-slate-500">没有可执行的步骤：请在「流水线步骤」里每行写一条。</p>'
  }
  const parts = result.stages.map((stage, index) => {
    const flag = stage.changed ? '' : '（本步未改动）'
    return (
      '<div class="stage">' +
      '<div class="stage-head">' +
      (index + 1) +
      '. ' +
      escapeHtml(stage.label) +
      ' ' +
      flag +
      '</div>' +
      '<pre class="stage-body">' +
      escapeHtml(preview(stage.text, 3)) +
      '</pre>' +
      '</div>'
    )
  })
  if (result.errors.length > 0) {
    parts.push(
      '<p class="stage-error">未识别的步骤：' +
        escapeHtml(result.errors.join('、')) +
        '。可用步骤见下方 README 的选项说明。</p>',
    )
  }
  return parts.join('')
}
