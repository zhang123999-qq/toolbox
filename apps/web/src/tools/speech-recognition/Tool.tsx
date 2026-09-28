import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { optionsSchema } from './schema'
import type { SpeechRecognitionInput, SpeechRecognitionOptions } from './schema'
import {
  SUPPORTED_LANGS,
  formatMatchSummary,
  matchCommands,
  parseCommands,
  speechErrorToChinese,
  toHighlightRanges,
  validateCommands,
} from './utils'
import type { CommandMatch } from './utils'

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

const DEFAULT_COMMANDS = '打开灯\n关灯\n播放音乐\n停止'

/** 按高亮区间渲染识别文本，命中区间红色高亮 */
function renderHighlighted(transcript: string, matches: readonly CommandMatch[]): React.ReactNode {
  const ranges = toHighlightRanges(transcript, matches)
  if (ranges.length === 0) return transcript
  const parts: React.ReactNode[] = []
  let cursor = 0
  ranges.forEach((r, i) => {
    if (r.start > cursor) parts.push(<span key={`p${i}`}>{transcript.slice(cursor, r.start)}</span>)
    parts.push(
      <span
        key={`h${i}`}
        className="rounded bg-red-200 px-0.5 font-semibold text-red-800 dark:bg-red-900 dark:text-red-200"
      >
        {transcript.slice(r.start, r.end)}
      </span>,
    )
    cursor = r.end
  })
  if (cursor < transcript.length) parts.push(<span key="tail">{transcript.slice(cursor)}</span>)
  return parts
}

export default function Tool() {
  const [listening, setListening] = useState(false)
  const [lang, setLang] = useState('zh-CN')
  const [commandsText, setCommandsText] = useState(DEFAULT_COMMANDS)
  const [commands, setCommands] = useState<string[]>([])
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [matches, setMatches] = useState<CommandMatch[]>([])
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

  /** 开始监听：解析并校验命令词后启动持续识别 */
  function start(): void {
    setError('')
    let valid: string[]
    try {
      const { commands: parsed, truncated } = parseCommands(commandsText)
      valid = validateCommands(parsed)
      if (truncated) setError(`命令词超过 ${valid.length} 个，已只取前 ${valid.length} 个`)
      optionsSchema.parse({ lang })
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
      rec.lang = lang
      rec.continuous = true
      rec.interimResults = true
      rec.onresult = (event) => {
        let finalText = ''
        let interimText = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i]!
          const text = res[0]?.transcript ?? ''
          if (res.isFinal) finalText += text
          else interimText += text
        }
        if (finalText !== '') {
          const m = matchCommands(finalText, valid)
          setTranscript(finalText)
          setMatches(m)
        }
        setInterim(interimText)
      }
      rec.onerror = (event) => {
        setError(speechErrorToChinese(event.error))
      }
      rec.onend = () => {
        if (listeningRef.current) {
          try {
            rec.start()
          } catch {
            listeningRef.current = false
            setListening(false)
          }
        }
      }
      setCommands(valid)
      listeningRef.current = true
      recRef.current = rec
      rec.start()
      setListening(true)
    } catch (err) {
      setError(toChineseError(err))
    }
  }

  function clearResult(): void {
    setTranscript('')
    setInterim('')
    setMatches([])
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

  return (
    <MultiPanel<SpeechRecognitionInput, SpeechRecognitionOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ lang: 'zh-CN' }}
      example={{ text: '' }}
      renderOutput={() => (
        <div className="flex flex-col gap-3">
          <div>
            <label
              htmlFor="sr-commands"
              className="mb-1 block text-sm text-slate-600 dark:text-slate-400"
            >
              预设命令词（每行一个，也可用逗号、分号、空格分隔）
            </label>
            <textarea
              id="sr-commands"
              data-testid="commands"
              rows={4}
              className="w-full rounded border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={commandsText}
              disabled={listening}
              onChange={(event) => setCommandsText(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="sr-lang" className="text-sm text-slate-600 dark:text-slate-400">
              识别语言
            </label>
            <select
              id="sr-lang"
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
              {listening ? '停止监听' : '开始监听'}
            </button>
            {(transcript !== '' || interim !== '') && (
              <button
                type="button"
                data-testid="clear-result"
                className={SECONDARY_BUTTON}
                onClick={clearResult}
              >
                清空结果
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
          {commands.length > 0 && (
            <div data-testid="command-list" className="flex flex-wrap gap-1">
              {commands.map((c) => (
                <span
                  key={c}
                  data-testid="command-chip"
                  className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                >
                  {c}
                </span>
              ))}
            </div>
          )}
          <div
            data-testid="transcript"
            className="min-h-24 whitespace-pre-wrap rounded border border-slate-200 bg-white p-3 text-sm leading-relaxed dark:border-slate-700 dark:bg-slate-900"
          >
            {transcript !== '' ? (
              <>
                {renderHighlighted(transcript, matches)}
                {interim !== '' && <span className="text-slate-400">（识别中…）</span>}
              </>
            ) : (
              <span className="text-slate-400">
                {listening ? '请说出命令词…' : '填写命令词后点「开始监听」，说出其中一个试试。'}
              </span>
            )}
          </div>
          {transcript !== '' && (
            <p data-testid="match-summary" className="text-xs text-slate-500">
              {formatMatchSummary(matches.length, commands.length)}
              {matches.length === 0 && '（未命中）'}
            </p>
          )}
          <p className="text-xs text-slate-500">
            本工具是命令匹配：只判断你说了预设命令词中的哪一个并高亮，不做全文转写；连续听写请用「音频转文字」工具。
          </p>
        </div>
      )}
      toText={() =>
        transcript !== ''
          ? `${transcript}\n${formatMatchSummary(matches.length, commands.length)}`
          : ''
      }
      downloadExt="txt"
    />
  )
}
