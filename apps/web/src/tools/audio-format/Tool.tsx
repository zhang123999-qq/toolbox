import { useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import type { AudioFormatFormOptions, AudioFormatInput } from './schema'
import { HEADER_BYTES, detectAudioFormat, formatReport } from './utils'

interface DoneResult {
  readonly report: string
}

/** 示例：最小 WAV 头（RIFF....WAVE + 空 data 段），走 detectAudioFormat 同一路识别 */
function makeExampleFile(): File {
  const head = new Uint8Array(44)
  const view = new DataView(head.buffer)
  const ascii = (offset: number, text: string): void => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i))
  }
  ascii(0, 'RIFF')
  view.setUint32(4, 36, true)
  ascii(8, 'WAVE')
  ascii(12, 'fmt ')
  ascii(36, 'data')
  return new File([head], '示例.wav', { type: 'audio/wav' })
}

export default function Tool() {
  const [result, setResult] = useState<DoneResult | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  function toChineseError(err: unknown): string {
    if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
    return err instanceof Error ? err.message : '处理失败，请重试'
  }

  /** 识别文件：只读前 HEADER_BYTES 字节头，纯函数识别 */
  async function handleFile(file: File): Promise<void> {
    setError('')
    setPending(true)
    try {
      if (file.size === 0) throw new Error('文件为空：没有可识别的内容')
      const head = new Uint8Array(await file.slice(0, HEADER_BYTES).arrayBuffer())
      const guess = detectAudioFormat(head)
      setResult({ report: formatReport(file.name, file.size, guess) })
    } catch (err) {
      setError(toChineseError(err))
      setResult(null)
    } finally {
      setPending(false)
    }
  }

  return (
    <MultiPanel<AudioFormatInput, AudioFormatFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      optionDefs={[]}
      example={{ text: '' }}
      renderOutput={() => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className={SECONDARY_BUTTON} htmlFor="audio-format-file">
              选择音频文件
            </label>
            <input
              id="audio-format-file"
              type="file"
              accept="audio/*"
              data-testid="file"
              className="hidden"
              onChange={(event) => {
                const f = event.target.files?.[0]
                if (f) void handleFile(f)
                event.target.value = ''
              }}
            />
            <button
              type="button"
              data-testid="example-audio"
              className={SECONDARY_BUTTON}
              onClick={() => void handleFile(makeExampleFile())}
            >
              载入示例音频
            </button>
          </div>
          {pending ? <p className="text-sm text-slate-500">识别中…</p> : null}
          {error ? (
            <div
              role="alert"
              data-testid="error"
              className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
            >
              {error}
            </div>
          ) : null}
          {result ? (
            <p
              data-testid="result-info"
              className="whitespace-pre-line text-sm text-slate-700 dark:text-slate-300"
            >
              {result.report}
            </p>
          ) : null}
          {!result && !pending && !error ? (
            <p className="text-sm text-slate-500">
              选择音频文件或载入示例，只读取文件头 {HEADER_BYTES} 字节做魔数识别，不解码整文件。
            </p>
          ) : null}
        </div>
      )}
      toText={() => result?.report ?? ''}
      downloadExt="txt"
    />
  )
}
