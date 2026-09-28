import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { UserscriptToolInput } from './schema'
import { EXAMPLE_USERSCRIPT, generateUserscript, parseUserscriptInput } from './utils'

const BTN_CLS =
  'rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500'
const PRE_CLS =
  'max-h-80 overflow-auto rounded bg-slate-50 p-3 font-mono text-xs break-all whitespace-pre-wrap dark:bg-slate-900'

export default function Tool() {
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  function handleRun(input: UserscriptToolInput): void {
    setError('')
    setOutput('')
    try {
      setOutput(generateUserscript(parseUserscriptInput(input.text)))
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  return (
    <MultiPanel<UserscriptToolInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: JSON.stringify(EXAMPLE_USERSCRIPT, null, 2) }}
      initialOptions={{}}
      example={{
        text: JSON.stringify(
          { ...EXAMPLE_USERSCRIPT, grants: ['GM_addStyle', 'GM_registerMenuCommand'] },
          null,
          2,
        ),
      }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div>
            <button
              type="button"
              data-testid="userscript-run"
              onClick={() => handleRun(input)}
              className={BTN_CLS}
            >
              生成用户脚本
            </button>
          </div>
          {error !== '' && (
            <p data-testid="userscript-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {output !== '' && (
            <pre data-testid="userscript-output" className={PRE_CLS}>
              {output}
            </pre>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：输入脚本元信息 JSON，生成带校验的 Tampermonkey 头注释与脚本骨架。 version 须为
            x.y.z；grants 限白名单，none 不可混用。纯本地生成。
          </p>
        </div>
      )}
      toText={() => output}
    />
  )
}
