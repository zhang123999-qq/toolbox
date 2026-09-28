import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { LevelEditorToolInput } from './schema'
import {
  OBJECT_TYPES,
  addObject,
  exportLevelJson,
  formatLevelObjects,
  importLevelJson,
  makeLevelObject,
  validateLevel,
  type LevelObjectType,
} from './utils'

const BTN_CLS =
  'rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500'
const INPUT_CLS =
  'rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800'
const PRE_CLS =
  'max-h-80 overflow-auto rounded bg-slate-50 p-3 font-mono text-xs break-all whitespace-pre-wrap dark:bg-slate-900'

const EXAMPLE = JSON.stringify(
  [
    { id: 'spawn1', type: 'spawn', x: 10, y: 10 },
    { id: 'exit1', type: 'exit', x: 90, y: 90 },
    { id: 'slime1', type: 'enemy', x: 50, y: 50, props: { hp: 100 } },
  ],
  null,
  2,
)

export default function Tool() {
  const [objId, setObjId] = useState('item1')
  const [objType, setObjType] = useState<LevelObjectType>('item')
  const [objX, setObjX] = useState('30')
  const [objY, setObjY] = useState('30')
  const [boundW, setBoundW] = useState('100')
  const [boundH, setBoundH] = useState('100')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  function fail(err: unknown): void {
    setOutput('')
    setError(err instanceof Error ? err.message : '执行失败')
  }

  function parseBounds(): { width: number; height: number } {
    const width = Number(boundW)
    const height = Number(boundH)
    if (!Number.isFinite(width) || !Number.isFinite(height)) throw new Error('关卡宽高必须是数字')
    return { width, height }
  }

  function handleAdd(input: LevelEditorToolInput): void {
    setError('')
    try {
      const objects = importLevelJson(input.text.trim() === '' ? '[]' : input.text)
      const next = addObject(objects, makeLevelObject(objId, objType, Number(objX), Number(objY)))
      setOutput(exportLevelJson(next))
    } catch (err) {
      fail(err)
    }
  }

  function handleValidate(input: LevelEditorToolInput): void {
    setError('')
    try {
      const objects = importLevelJson(input.text.trim() === '' ? '[]' : input.text)
      const issues = validateLevel(objects, parseBounds())
      setOutput(issues.length === 0 ? '校验通过：关卡合法' : `发现 ${issues.length} 个问题：\n${issues.join('\n')}`)
    } catch (err) {
      fail(err)
    }
  }

  function handlePreview(input: LevelEditorToolInput): void {
    setError('')
    try {
      setOutput(formatLevelObjects(importLevelJson(input.text.trim() === '' ? '[]' : input.text)))
    } catch (err) {
      fail(err)
    }
  }

  return (
    <MultiPanel<LevelEditorToolInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: EXAMPLE }}
      initialOptions={{}}
      example={{ text: EXAMPLE }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <input data-testid="level-id" value={objId} onChange={(e) => setObjId(e.target.value)} placeholder="对象 id" className={INPUT_CLS} />
            <select data-testid="level-type" value={objType} onChange={(e) => setObjType(e.target.value as LevelObjectType)} className={INPUT_CLS}>
              {OBJECT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input data-testid="level-x" value={objX} onChange={(e) => setObjX(e.target.value)} placeholder="x" className={`${INPUT_CLS} w-20`} />
            <input data-testid="level-y" value={objY} onChange={(e) => setObjY(e.target.value)} placeholder="y" className={`${INPUT_CLS} w-20`} />
            <button type="button" data-testid="level-add" onClick={() => handleAdd(input)} className={BTN_CLS}>
              添加对象
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">关卡尺寸</span>
            <input data-testid="level-w" value={boundW} onChange={(e) => setBoundW(e.target.value)} className={`${INPUT_CLS} w-20`} />
            <span className="text-xs">×</span>
            <input data-testid="level-h" value={boundH} onChange={(e) => setBoundH(e.target.value)} className={`${INPUT_CLS} w-20`} />
            <button type="button" data-testid="level-validate" onClick={() => handleValidate(input)} className={BTN_CLS}>
              校验关卡
            </button>
            <button type="button" data-testid="level-preview" onClick={() => handlePreview(input)} className="rounded border border-slate-300 px-4 py-1.5 text-sm dark:border-slate-600">
              对象列表
            </button>
          </div>
          {error !== '' && (
            <p data-testid="level-error" className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          {output !== '' && (
            <pre data-testid="level-output" className={PRE_CLS}>{output}</pre>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：上方文本框为关卡对象 JSON 数组（导出/导入格式）；「添加对象」后把输出 JSON 复制回文本框继续编辑。纯本地计算。
          </p>
        </div>
      )}
      toText={() => output}
    />
  )
}
