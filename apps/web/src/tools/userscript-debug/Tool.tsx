import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { UserscriptDebugToolInput } from './schema'
import { renderUserscriptIssues, scanUserscript } from './utils'

const BTN_CLS =
  'rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500'
const PRE_CLS =
  'max-h-80 overflow-auto rounded bg-slate-50 p-3 font-mono text-xs break-all whitespace-pre-wrap dark:bg-slate-900'

const EXAMPLE_SCRIPT = `// ==UserScript==
// @name         示例脚本
// @namespace    https://example.com
// @version      1.0.0
// @description  示例用户脚本
// @match        https://example.com/*
// @grant        GM_setValue
// ==/UserScript==

(function () {
  'use strict'
  GM_setValue('visited', Date.now())
})()
`

export default function Tool() {
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  function handleScan(input: UserscriptDebugToolInput): void {
    setError('')
    setOutput('')
    try {
      setOutput(renderUserscriptIssues(scanUserscript(input.text)))
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  return (
    <MultiPanel<UserscriptDebugToolInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: EXAMPLE_SCRIPT }}
      initialOptions={{}}
      example={{ text: EXAMPLE_SCRIPT }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="usdebug-run"
              onClick={() => handleScan(input)}
              className={BTN_CLS}
            >
              开始扫描
            </button>
          </div>
          {error !== '' && (
            <p data-testid="usdebug-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {output !== '' && (
            <pre data-testid="usdebug-output" className={PRE_CLS}>
              {output}
            </pre>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：在上方输入框粘贴用户脚本源码，点击「开始扫描」检查元数据块、
            @match 写法、GM_ 函数与 @grant 声明一致性，以及 document.write /
            eval 等风险写法。纯本地扫描，不发送网络请求。
          </p>
        </div>
      )}
      toText={() => output}
    />
  )
}
