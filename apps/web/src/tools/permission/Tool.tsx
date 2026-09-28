import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { PermissionToolInput } from './schema'
import {
  buildPermissionsManifest,
  EXAMPLE_PERMISSIONS,
  explainPermission,
  listPermissions,
  parsePermissionsInput,
  RISK_LABELS,
} from './utils'

const BTN_CLS =
  'rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500'
const PRE_CLS =
  'max-h-80 overflow-auto rounded bg-slate-50 p-3 font-mono text-xs break-all whitespace-pre-wrap dark:bg-slate-900'

const RISK_CLS: Record<string, string> = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

export default function Tool() {
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  function handleRun(input: PermissionToolInput): void {
    setError('')
    setOutput('')
    try {
      const parsed = parsePermissionsInput(input.text)
      // 先逐个解释，未知权限直接抛中文错
      for (const name of parsed.permissions) {
        explainPermission(name)
      }
      setOutput(buildPermissionsManifest(parsed))
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  return (
    <MultiPanel<PermissionToolInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: JSON.stringify(EXAMPLE_PERMISSIONS, null, 2) }}
      initialOptions={{}}
      example={{
        text: JSON.stringify({ permissions: ['cookies', 'history'], hostPermissions: [] }, null, 2),
      }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div>
            <button
              type="button"
              data-testid="permission-run"
              onClick={() => handleRun(input)}
              className={BTN_CLS}
            >
              生成权限清单
            </button>
          </div>
          {error !== '' && (
            <p data-testid="permission-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {output !== '' && (
            <pre data-testid="permission-output" className={PRE_CLS}>
              {output}
            </pre>
          )}
          <div>
            <p className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-300">
              权限字典（{listPermissions().length} 个）
            </p>
            <ul className="flex max-h-60 flex-col gap-1 overflow-auto">
              {listPermissions().map((p) => (
                <li key={p.name} className="flex items-center gap-2 text-xs">
                  <code className="rounded bg-slate-100 px-1 font-mono dark:bg-slate-800">
                    {p.name}
                  </code>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${RISK_CLS[p.risk]}`}
                  >
                    {RISK_LABELS[p.risk]}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">{p.description}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：输入 JSON（permissions / hostPermissions），生成可直接并入 manifest.json
            的权限片段。高风险权限会触发商店严格审核，请按需申请。 纯本地生成。
          </p>
        </div>
      )}
      toText={() => output}
    />
  )
}
