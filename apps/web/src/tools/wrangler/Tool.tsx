import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { WranglerInput, WranglerOptions } from './schema'
import { buildCommand, COMMANDS, EXAMPLE_ARGS, getCommandDef, parseArgsText } from './utils'

function buildResult(input: WranglerInput, options: WranglerOptions): string {
  const args = parseArgsText(input.text)
  return buildCommand(options.action, args)
}

export default function Tool() {
  return (
    <MultiPanel<WranglerInput, WranglerOptions>
      meta={meta}
      initialInput={{ text: EXAMPLE_ARGS }}
      initialOptions={{ action: 'kv-put' }}
      example={{ text: EXAMPLE_ARGS }}
      optionDefs={[
        {
          key: 'action',
          label: '命令',
          kind: 'select',
          values: COMMANDS.map((c) => c.action),
        },
      ]}
      renderOutput={(input, options) => {
        let command = ''
        let error = ''
        try {
          command = buildResult(input, options)
        } catch (err) {
          error = err instanceof Error ? err.message : '生成失败'
        }
        const def = getCommandDef(options.action)
        return (
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-sm font-medium">{def.title}</p>
              <p data-testid="wrangler-desc" className="text-sm text-slate-600 dark:text-slate-400">
                {def.description}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                必填参数：{def.requiredArgs.length > 0 ? def.requiredArgs.join('、') : '无'}
              </p>
              <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">
                示例：{def.example}
              </p>
            </div>
            {error !== '' && (
              <p data-testid="wrangler-error" className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
            {command !== '' && (
              <pre data-testid="wrangler-command" className="whitespace-pre-wrap font-mono text-sm">
                {command}
              </pre>
            )}
            <details className="text-sm">
              <summary className="cursor-pointer text-slate-600 dark:text-slate-400">
                全部 {COMMANDS.length} 条常用命令速查
              </summary>
              <ul className="mt-2 flex flex-col gap-1">
                {COMMANDS.map((c) => (
                  <li key={c.action} className="font-mono text-xs">
                    <span className="text-slate-500">{c.title}：</span>
                    {c.example}
                  </li>
                ))}
              </ul>
            </details>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              说明：左侧按「key=value」逐行填写参数；命令需在已安装 wrangler 且登录（`npx wrangler
              login`）的终端中执行。参数值含空格时请自行加引号。
            </p>
          </div>
        )
      }}
      toText={(input, options) => {
        try {
          return buildResult(input, options)
        } catch {
          return ''
        }
      }}
      downloadExt="sh"
    />
  )
}
