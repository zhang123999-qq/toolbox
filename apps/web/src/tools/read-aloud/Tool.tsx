import { useEffect, useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { ReadAloudInput, ReadAloudOptions } from './schema'
import {
  buildQueue,
  defaultSpeechImpl,
  filterChineseVoices,
  listVoices,
  speakText,
  stopSpeaking,
  validateSpeechOptions,
  type SpeechLike,
  type VoiceInfo,
} from './utils'

const EXAMPLE_TEXT = '你好，欢迎使用语音朗读。这是一段示例文本，可以调整语速、音调和音量。'

function toNum(v: string): number {
  return v.trim() === '' ? NaN : Number(v)
}

export default function Tool() {
  const [rate, setRate] = useState('1')
  const [pitch, setPitch] = useState('1')
  const [volume, setVolume] = useState('1')
  const [voiceURI, setVoiceURI] = useState('')
  const [voices, setVoices] = useState<VoiceInfo[]>([])
  const [status, setStatus] = useState('')
  // speech 实现懒初始化：浏览器不支持时为 null（降级提示）
  const [impl] = useState<SpeechLike | null>(() => {
    try {
      return defaultSpeechImpl()
    } catch {
      return null
    }
  })
  const supported = impl !== null

  // 某些浏览器异步加载语音列表：定时刷新 + 监听 voiceschanged
  useEffect(() => {
    if (impl === null) return
    const synth = window.speechSynthesis
    const refresh = (): void => setVoices(listVoices(impl))
    refresh()
    const timer = window.setTimeout(refresh, 500)
    synth.addEventListener('voiceschanged', refresh)
    return () => {
      window.clearTimeout(timer)
      synth.removeEventListener('voiceschanged', refresh)
    }
  }, [impl])

  function opts() {
    return {
      rate: toNum(rate),
      pitch: toNum(pitch),
      volume: toNum(volume),
      voiceURI: voiceURI === '' ? undefined : voiceURI,
      lang: 'zh-CN',
    }
  }

  function handleSpeak(text: string): void {
    if (!impl) return
    try {
      const n = speakText(text, opts(), impl)
      setStatus(`正在朗读（${n} 句）…`)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : '朗读失败')
    }
  }

  function handleStop(): void {
    if (!impl) return
    stopSpeaking(impl)
    setStatus('已停止')
  }

  function paramError(): string {
    try {
      validateSpeechOptions(opts())
      return ''
    } catch (err) {
      return err instanceof Error ? err.message : '参数错误'
    }
  }

  const pErr = paramError()
  const chineseVoices = filterChineseVoices(voices)

  return (
    <MultiPanel<ReadAloudInput, ReadAloudOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={{ text: EXAMPLE_TEXT }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          {!supported && (
            <div role="alert" data-testid="unsupported" className="rounded border border-amber-300 bg-amber-50 p-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              当前浏览器不支持语音朗读（缺少 speechSynthesis）。请使用 Chrome / Edge / Safari。
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 rounded border border-slate-200 p-2 dark:border-slate-700">
            <label className="flex items-center gap-1 text-sm">
              <span className="w-12 shrink-0 text-slate-600 dark:text-slate-400">语速</span>
              <input
                type="range"
                data-testid="rate"
                min="0.5"
                max="2"
                step="0.1"
                className="w-full"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
              <span data-testid="rate-value" className="w-8 font-mono text-xs">{rate}</span>
            </label>
            <label className="flex items-center gap-1 text-sm">
              <span className="w-12 shrink-0 text-slate-600 dark:text-slate-400">音调</span>
              <input
                type="range"
                data-testid="pitch"
                min="0"
                max="2"
                step="0.1"
                className="w-full"
                value={pitch}
                onChange={(e) => setPitch(e.target.value)}
              />
              <span data-testid="pitch-value" className="w-8 font-mono text-xs">{pitch}</span>
            </label>
            <label className="flex items-center gap-1 text-sm">
              <span className="w-12 shrink-0 text-slate-600 dark:text-slate-400">音量</span>
              <input
                type="range"
                data-testid="volume"
                min="0"
                max="1"
                step="0.1"
                className="w-full"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
              />
              <span data-testid="volume-value" className="w-8 font-mono text-xs">{volume}</span>
            </label>
            <label className="flex items-center gap-1 text-sm">
              <span className="w-12 shrink-0 text-slate-600 dark:text-slate-400">语音</span>
              <select
                data-testid="voice"
                className="w-full rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                value={voiceURI}
                onChange={(e) => setVoiceURI(e.target.value)}
              >
                <option value="">默认语音</option>
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name}（{v.lang}）
                  </option>
                ))}
              </select>
            </label>
          </div>
          {chineseVoices.length > 0 && (
            <div data-testid="chinese-voices" className="text-xs text-slate-500 dark:text-slate-400">
              检测到中文语音：{chineseVoices.map((v) => v.name).join('、')}
            </div>
          )}
          {pErr && (
            <div role="alert" data-testid="param-error" className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
              {pErr}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="speak-btn"
              disabled={!supported || pErr !== '' || input.text.trim() === ''}
              onClick={() => handleSpeak(input.text)}
              className="rounded bg-brand px-4 py-1.5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              朗读
            </button>
            <button
              type="button"
              data-testid="stop-btn"
              onClick={handleStop}
              className="rounded border border-slate-300 px-4 py-1.5 text-sm dark:border-slate-700"
            >
              停止
            </button>
            {status && (
              <span data-testid="speak-status" className="text-sm text-slate-600 dark:text-slate-400">
                {status}
              </span>
            )}
          </div>
          <div data-testid="queue-info" className="text-xs text-slate-500 dark:text-slate-400">
            {input.text.trim() === ''
              ? '在上方输入框填写要朗读的文本'
              : `将按 ${(() => {
                  try {
                    return buildQueue(input.text, opts()).length
                  } catch {
                    return 0
                  }
                })()} 句依次朗读（浏览器原生排队）`}
          </div>
        </div>
      )}
      toText={(input) => input.text}
      downloadExt="txt"
    />
  )
}
