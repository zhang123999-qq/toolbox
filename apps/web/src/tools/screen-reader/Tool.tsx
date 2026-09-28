import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { formatPreview, previewScreenReader } from './utils'
import type { ScreenReaderInput, ScreenReaderOptions } from './schema'

/** 示例：含典型问题的页面片段 */
const EXAMPLE: ScreenReaderInput = {
  text: [
    '<header><nav aria-label="主导航"><a href="/">首页</a></nav></header>',
    '<main>',
    '<h1>文章标题</h1>',
    '<h3>跳过 h2 的小节</h3>',
    '<p>正文 <a href="/more">点击这里</a></p>',
    '<img src="cat.png">',
    '<label>昵称<input type="text"></label>',
    '<button>提交</button>',
    '</main>',
  ].join('\n'),
}

function run(input: ScreenReaderInput): string {
  const text = input.text.trim() === '' ? EXAMPLE.text : input.text
  return formatPreview(previewScreenReader(text))
}

export default function Tool() {
  return (
    <TwoColumn<ScreenReaderInput, ScreenReaderOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={run}
      idleText="粘贴 HTML 后点「运行」，从屏幕阅读器视角生成朗读大纲并检查无障碍问题"
      example={EXAMPLE}
    />
  )
}
