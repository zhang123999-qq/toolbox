import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { optionsSchema } from './schema'
import type { AudioToTextFormOptions, AudioToTextInput } from './schema'
import {
  SUPPORTED_LANGS,
  appendFinalSegment,
  buildTranscript,
  normalizeLang,
  speechErrorToChinese,
  summarizeTranscript,
} from './utils'

/**
 * Web Speech API 的最小类型声明（TS DOM lib 未收录 SpeechRecognition）。
 * 仅描述本工具用到的成员。
 */
interface SpeechAlternative {
  readonly transcript: string
}
interface SpeechRecognitionResultLike {
  readonly isFinal: boolean
  readonly length: number
  readonly [index: number]: SpeechAlternative | undefined
}
interface SpeechRecognitionEventLike {
  readonly resultIndex: number
  readonly results: ArrayLike<SpeechRecognitionResultLike>
}
interface SpeechRecognitionErrorLike {
  readonly error: string
}
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}
interface SpeechRecognitionCtor {
  new (): SpeechRecognitionLike
}
interface BrowserSpeech {
  readonly SpeechRecognition?: SpeechRecognitionCtor
  readonly webkitSpeechRecognition?: SpeechRecognitionCtor
}

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const g = globalThis as unknown as BrowserSpeech
  return g.SpeechRecognition ?? g.webkitSpeechRecognition ?? null
}

export default function Tool() {
  const [listening, setListening] = useState(false)
  const [lang, setLang] = useState('zh-CN')
  const [segments, setSegments] = useState<string[]>([])
  const [interim, setInterim] = useState('')
  const [error, setError] = useState('')
  const listeningRef = useRef(false)
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const supported = getSpeechRecognitionCtor() !== null

  function toChineseError(err: unknown): string {
    if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
    return err instanceof Error ? err.message : '启动失败，请重试'
  }

  function stop(): void {
    listeningRef.current = false
    const rec = recRef.current
    recRef.current = null
    if (rec) {
      rec.onresult = null
      rec.onerror = null
      rec.onend = null
      try {
        rec.stop()
      } catch {
        /* 已停止则忽略 */
      }
    }
    setListening(false)
    setInterim('')
  }

  /** 开始连续听写 */
  function start(): void {
    setError('')
    let language: string
    try {
      language = normalizeLang(lang)
      optionsSchema.parse({ lang: language })
    } catch (err) {
      setError(toChineseError(err))
      return
    }
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) {
      setError('当前浏览器不支持语音识别（请使用 Chrome / Edge 浏览器）')
      return
    }
    try {
      const rec = new Ctor()
      rec.lang = language
      rec.continuous = true
      rec.interimResults = true
      rec.onresult = (event) => {
        const finals: string[] = []
        let interimText = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i]!
          const text = res[0]?.transcript ?? ''
          if (res.isFinal) finals.push(text)
          else interimText += text
        }
        if (finals.length > 0) {
          setSegments((prev) => {
            let next = prev
            for (const f of finals) next = appendFinalSegment(next, f)
            return next
          })
        }
        setInterim(interimText)
      }
      rec.onerror = (event) => {
        setError(speechErrorToChinese(event.error))
      }
      rec.onend = () => {
        // 浏览器可能因静音自动结束：只要用户没点停止就自动续上
        if (listeningRef.current) {
          try {
            rec.start()
          } catch {
            listeningRef.current = false
            setListening(false)
          }
        }
      }
      listeningRef.current = true
      recRef.current = rec
      rec.start()
      setListening(true)
    } catch (err) {
      setError(toChineseError(err))
    }
  }

  function clearTranscript(): void {
    setSegments([])
    setInterim('')
  }

  // 卸载时停止识别
  useEffect(() => {
    return () => {
      listeningRef.current = false
      const rec = recRef.current
      recRef.current = null
      if (rec) {
        try {
          rec.stop()
        } catch {
          /* 忽略 */
        }
      }
    }
  }, [])

  const transcript = buildTranscript(segments, interim)

  return (
    <MultiPanel<AudioToTextInput, AudioToTextFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ lang: 'zh-CN' }}
      example={{ text: '' }}
      renderOutput={() => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="a2t-lang" className="text-sm text-slate-600 dark:text-slate-400">
              识别语言
            </label>
            <select
              id="a2t-lang"
              data-testid="lang"
              className="rounded border border-slate-300 px-1 py-1 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={lang}
              disabled={listening}
              onChange={(event) => setLang(event.target.value)}
            >
              {SUPPORTED_LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              data-testid="start-stop"
              disabled={!supported}
              className="rounded bg-brand px-4 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-40"
              onClick={() => (listening ? stop() : start())}
            >
              {listening ? '停止听写' : '开始听写'}
            </button>
            {(segments.length > 0 || interim !== '') && (
              <button
                type="button"
                data-testid="clear-transcript"
                className={SECONDARY_BUTTON}
                onClick={clearTranscript}
              >
                清空文字
              </button>
            )}
          </div>
          {!supported ? (
            <div
              role="alert"
              data-testid="unsupported"
              className="rounded border border-amber-300 bg-amber-50 p-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
            >
              当前浏览器不支持语音识别（Web Speech API），请使用 Chrome / Edge 浏览器。
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
          <div
            data-testid="transcript"
            className="min-h-40 whitespace-pre-wrap rounded border border-slate-200 bg-white p-3 text-sm leading-relaxed dark:border-slate-700 dark:bg-slate-900"
          >
            {transcript !== '' ? (
              <>
                {transcript}
                {interim !== '' && <span className="text-slate-400">（识别中…）</span>}
              </>
            ) : (
              <span className="text-slate-400">
                {listening
                  ? '请对着麦克风说话…'
                  : '点「开始听写」后对着麦克风说话，文字会实时出现在这里。'}
              </span>
            )}
          </div>
          {segments.length > 0 ? (
            <p data-testid="summary" className="text-xs text-slate-500">
              {summarizeTranscript(segments)}
            </p>
          ) : null}
          <p className="text-xs text-slate-500">
            本工具为连续听写：把你说的话逐句转成文字。如需「说出预设命令词并触发匹配」，请用「语音识别」工具。
          </p>
        </div>
      )}
      toText={() => buildTranscript(segments, '')}
      downloadExt="txt"
    />
  )
}
