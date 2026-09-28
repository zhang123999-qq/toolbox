import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { analyzeLandmarks, formatLandmarkReport } from './utils'
import type { LandmarkInput, LandmarkOptions } from './schema'

/** 示例：含典型地标问题的片段 */
const EXAMPLE: LandmarkInput = {
  text: [
    '<header><nav><a href="/">首页</a></nav></header>',
    '<nav><a href="/about">关于</a></nav>',
    '<div>主要内容没有 main 包裹</div>',
    '<div role="region"><p>无名区域</p></div>',
    '<footer>页脚</footer>',
  ].join('\n'),
}

function run(input: LandmarkInput): string {
  const text = input.text.trim() === '' ? EXAMPLE.text : input.text
  return formatLandmarkReport(analyzeLandmarks(text))
}

export default function Tool() {
  return (
    <TwoColumn<LandmarkInput, LandmarkOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={run}
      idleText="粘贴 HTML 后点「运行」，分析 ARIA 地标角色与命名问题"
      example={EXAMPLE}
    />
  )
}
