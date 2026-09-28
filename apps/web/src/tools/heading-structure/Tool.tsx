import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { analyzeHeadings, formatHeadingReport } from './utils'
import type { HeadingStructureInput, HeadingStructureOptions } from './schema'

/** 示例：含典型标题结构问题的片段 */
const EXAMPLE: HeadingStructureInput = {
  text: [
    '<h1>主标题</h1>',
    '<h1>又一个主标题</h1>',
    '<h3>跳过了 h2</h3>',
    '<h2></h2>',
    '<h2>这是一个非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常长的标题</h2>',
  ].join('\n'),
}

function run(input: HeadingStructureInput): string {
  const text = input.text.trim() === '' ? EXAMPLE.text : input.text
  return formatHeadingReport(analyzeHeadings(text))
}

export default function Tool() {
  return (
    <TwoColumn<HeadingStructureInput, HeadingStructureOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={run}
      idleText="粘贴 HTML 后点「运行」，生成标题大纲、结构评分与修复建议"
      example={EXAMPLE}
    />
  )
}
