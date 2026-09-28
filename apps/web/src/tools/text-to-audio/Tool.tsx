import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { optionsSchema } from './schema'
import type { TextToAudioFormOptions, TextToAudioInput } from './schema'
import { chunkText, formatSpeakSummary, validateSpeakOptions } from './utils'

/** 浏览器语音合成的最小类型声明 */
interface BrowserSpeech {
  readonly speechSynthesis?: SpeechSynthesis
  readonly SpeechSynthesisUtterance?: new (text: string) => SpeechSynthesisUtterance
}

export default function Tool() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voiceName, setVoiceName] = useState('')
  const [speaking, setSpeaking] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const speakingRef = useRef(false)

  const g = globalThis as unknown as BrowserSpeech
  const supported = Boolean(g.speechSynthesis && g.SpeechSynthesisUtterance)

  const optionDefs: readonly OptionDef<TextToAudioFormOptions>[] = [
    { key: 'rate', label: '语速', kind: 'text', placeholder: '1' },
    { key: 'pitch', label: '音调', kind: 'text', placeholder: '1' },
  ]

  // 加载可用音色
  useEffect(() => {
    const synth = (globalThis as unknown as BrowserSpeech).speechSynthesis
    if (!synth) return
    const load = (): void => {
      const list = synth.getVoices()
      setVoices(list)
      setVoiceName((prev) => {
        if (prev) return prev
        const zh = list.find((v) => v.lang.startsWith('zh'))
        return (zh ?? list[0])?.name ?? ''
      })
    }
    load()
    synth.onvoiceschanged = load
    return () => {
      synth.onvoiceschanged = null
    }
  }, [])

  // 卸载时停止朗读
  useEffect(() => {
    return () => {
      speakingRef.current = false
      const synth = (globalThis as unknown as BrowserSpeech).speechSynthesis
      if (synth) {
        try {
          synth.cancel()
        } catch {
          /* 忽略 */
        }
      }
    }
  }, [])

  function toChineseError(err: unknown): string {
    if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
    return err instanceof Error ? err.message : '朗读失败，请重试'
  }

  function stop(): void {
    speakingRef.current = false
    const synth = (globalThis as unknown as BrowserSpeech).speechSynthesis
    if (synth) {
      try {
        synth.cancel()
      } catch {
        /* 忽略 */
      }
    }
    setSpeaking(false)
    setStatus('已停止')
  }

  /** 朗读：分段后逐段 speak，onend 链式推进 */
  function speak(text: string, raw: TextToAudioFormOptions): void {
    setError('')
    const synth = (globalThis as unknown as BrowserSpeech).speechSynthesis
    const Utterance = (globalThis as unknown as BrowserSpeech).SpeechSynthesisUtterance
    if (!synth || !Utterance) {
      setError('当前浏览器不支持语音合成（请使用 Chrome / Edge 浏览器）')
      return
    }
    let opts: { text: string; rate: number; pitch: number }
    try {
      const parsed = optionsSchema.parse(raw)
      opts = validateSpeakOptions(text, parsed.rate, parsed.pitch)
    } catch (err) {
      setError(toChineseError(err))
      return
    }
    let chunks: string[]
    try {
      chunks = chunkText(opts.text)
    } catch (err) {
      setError(toChineseError(err))
      return
    }
    const voice = voices.find((v) => v.name === voiceName) ?? null
    speakingRef.current = true
    setSpeaking(true)
    let index = 0
    const speakNext = (): void => {
      if (!speakingRef.current || index >= chunks.length) {
        speakingRef.current = false
        setSpeaking(false)
        if (index >= chunks.length) setStatus('朗读完成')
        return
      }
      const u = new Utterance(chunks[index]!)
      u.rate = opts.rate
      u.pitch = opts.pitch
      u.volume = 1
      if (voice) {
        u.voice = voice
        u.lang = voice.lang
      }
      setStatus(`朗读中（${index + 1}/${chunks.length}）`)
      u.onend = () => {
        index++
        speakNext()
      }
      u.onerror = (event) => {
        speakingRef.current = false
        setSpeaking(false)
        setError(`朗读出错（${event.error}），请重试`)
      }
      try {
        synth.speak(u)
      } catch (err) {
        speakingRef.current = false
        setSpeaking(false)
        setError(toChineseError(err))
      }
    }
    setStatus(formatSpeakSummary(chunks.length, opts.rate, opts.pitch))
    speakNext()
  }

  return (
    <MultiPanel<TextToAudioInput, TextToAudioFormOptions>
      meta={meta}
      initialInput={{ text: '你好，这是一段测试朗读文字。' }}
      initialOptions={{ rate: '1', pitch: '1' }}
      optionDefs={optionDefs}
      example={{ text: '床前明月光，疑是地上霜。举头望明月，低头思故乡。' }}
      renderOutput={(input, options) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="t2a-voice" className="text-sm text-slate-600 dark:text-slate-400">
              音色
            </label>
            <select
              id="t2a-voice"
              data-testid="voice"
              className="max-w-56 rounded border border-slate-300 px-1 py-1 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={voiceName}
              onChange={(event) => setVoiceName(event.target.value)}
            >
              {voices.length === 0 ? (
                <option value="">（加载中…）</option>
              ) : (
                voices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name}（{v.lang}）
                  </option>
                ))
              )}
            </select>
            {!speaking ? (
              <button
                type="button"
                data-testid="speak"
                disabled={!supported}
                className="rounded bg-brand px-4 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-40"
                onClick={() => speak(input.text, options)}
              >
                朗读
              </button>
            ) : (
              <button
                type="button"
                data-testid="stop"
                className="rounded bg-red-500 px-4 py-1.5 text-sm text-white hover:opacity-90"
                onClick={stop}
              >
                停止
              </button>
            )}
          </div>
          {!supported ? (
            <div
              role="alert"
              data-testid="unsupported"
              className="rounded border border-amber-300 bg-amber-50 p-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
            >
              当前浏览器不支持语音合成（SpeechSynthesis），请使用 Chrome / Edge 浏览器。
            </div>
          ) : null}
          {error ? (
            <div
              role="alert"
              data-testid="error"
              className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
            >
              {error}
            </div>
          ) : null}
          {status ? (
            <p data-testid="speak-status" className="text-sm text-slate-700 dark:text-slate-300">
              {status}
            </p>
          ) : (
            <p className="text-sm text-slate-500">
              在左侧输入文字，选择音色、语速、音调后点「朗读」。长文本会自动按句子分段逐段朗读。
            </p>
          )}
          <p className="text-xs text-slate-500">
            导出提示：朗读的是左侧文本区的内容；点下方「复制 / 下载」可把文字导出为
            txt（浏览器语音合成不支持直接导出音频文件）。
          </p>
        </div>
      )}
      toText={(input) => input.text}
      downloadExt="txt"
    />
  )
}
