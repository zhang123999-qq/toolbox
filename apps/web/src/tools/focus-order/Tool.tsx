import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { formatTabOrder, getTabOrder } from './utils'
import type { FocusOrderInput, FocusOrderOptions } from './schema'

/** 示例：含正 tabindex 与 -1 的片段 */
const EXAMPLE: FocusOrderInput = {
  text: [
    '<nav>',
    '  <a href="/">首页</a>',
    '  <button tabindex="2">搜索</button>',
    '  <button tabindex="1">登录</button>',
    '</nav>',
    '<main>',
    '  <input type="text" aria-label="关键词">',
    '  <button tabindex="-1">脚本聚焦按钮</button>',
    '</main>',
  ].join('\n'),
}

function run(input: FocusOrderInput): string {
  const text = input.text.trim() === '' ? EXAMPLE.text : input.text
  return formatTabOrder(getTabOrder(text))
}

export default function Tool() {
  return (
    <TwoColumn<FocusOrderInput, FocusOrderOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={run}
      idleText="粘贴 HTML 后点「运行」，按编号列出实际 Tab 键顺序"
      example={EXAMPLE}
    />
  )
}
