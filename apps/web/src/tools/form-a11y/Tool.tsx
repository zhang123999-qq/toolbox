import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { analyzeFormA11y, formatFormA11yResult } from './utils'
import type { FormA11yInput, FormA11yOptions } from './schema'

/** 示例：缺少标签与必填标识的登录表单 */
const EXAMPLE: FormA11yInput = {
  text: '<form>\n  <input name="username" placeholder="用户名">\n  <input name="password" type="password" placeholder="密码" required>\n  <button type="submit">登录</button>\n</form>',
}

function run(input: FormA11yInput): string {
  const text = input.text.trim() === '' ? EXAMPLE.text : input.text
  try {
    return formatFormA11yResult(analyzeFormA11y(text))
  } catch (e) {
    return `检查失败：${e instanceof Error ? e.message : String(e)}`
  }
}

export default function Tool() {
  return (
    <TwoColumn<FormA11yInput, FormA11yOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={run}
      idleText="粘贴表单 HTML 片段，自动检查无障碍问题"
      example={EXAMPLE}
    />
  )
}
