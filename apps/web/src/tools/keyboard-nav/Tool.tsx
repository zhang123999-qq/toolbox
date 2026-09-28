import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { analyzeKeyboardNav, formatAnalysis } from './utils'
import type { KeyboardNavInput, KeyboardNavOptions } from './schema'

/** 示例：含典型键盘导航问题的片段 */
const EXAMPLE: KeyboardNavInput = {
  text: [
    '<header>',
    '  <a href="/">首页</a>',
    '  <button tabindex="1">搜索</button>',
    '  <button tabindex="1">登录</button>',
    '</header>',
    '<main>',
    '  <div onclick="submit()">提交</div>',
    '  <input type="text">',
    '  <button tabindex="-5">奇怪的按钮</button>',
    '</main>',
  ].join('\n'),
}

function run(input: KeyboardNavInput): string {
  const text = input.text.trim() === '' ? EXAMPLE.text : input.text
  return formatAnalysis(analyzeKeyboardNav(text))
}

export default function Tool() {
  return (
    <TwoColumn<KeyboardNavInput, KeyboardNavOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={run}
      idleText="粘贴 HTML 后点「运行」，分析可聚焦元素、Tab 顺序与键盘导航问题"
      example={EXAMPLE}
    />
  )
}
