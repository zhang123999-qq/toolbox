import { useState } from 'react'
import { meta } from './meta'
import {
  HEARING_FREQS,
  playTone,
  recordHearingResult,
  summarizeHearing,
  type AudioContextFactory,
  type HearingResults,
} from './utils'

const realFactory: AudioContextFactory = () => {
  const Ctor: typeof AudioContext | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  return Ctor ? new Ctor() : null
}

export default function Tool() {
  const [results, setResults] = useState<HearingResults>({})
  const [playing, setPlaying] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const testedCount = Object.keys(results).length
  const done = testedCount >= HEARING_FREQS.length

  const play = async (freq: number) => {
    setError(null)
    setPlaying(freq)
    try {
      await playTone(realFactory, freq, 1200)
    } catch (e) {
      setError(e instanceof Error ? e.message : '播放失败')
    } finally {
      setPlaying(null)
    }
  }

  const answer = (freq: number, heard: boolean) => {
    setResults((r) => recordHearingResult(r, freq, heard))
  }

  const restart = () => {
    setResults({})
    setError(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">{meta.title}</h2>
      <p className="text-sm text-slate-500">
        依次播放 7 个频率的声音，听见就点「听见」，听不见点「没听见」。建议佩戴耳机、在安静环境测试。
      </p>
      {error && (
        <p data-testid="ht-error" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-2">
        {HEARING_FREQS.map((freq) => {
          const answered = freq in results
          return (
            <div key={freq} className="flex items-center gap-2 text-sm">
              <span className="w-20">{freq} Hz</span>
              <button
                type="button"
                data-testid={`ht-play-${freq}`}
                onClick={() => void play(freq)}
                disabled={playing !== null}
                className="rounded bg-blue-600 px-3 py-1 text-white disabled:opacity-50"
              >
                {playing === freq ? '播放中…' : '播放'}
              </button>
              <button
                type="button"
                data-testid={`ht-heard-${freq}`}
                onClick={() => answer(freq, true)}
                className={`rounded px-3 py-1 ${
                  answered && results[freq] ? 'bg-green-600 text-white' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                听见
              </button>
              <button
                type="button"
                data-testid={`ht-missed-${freq}`}
                onClick={() => answer(freq, false)}
                className={`rounded px-3 py-1 ${
                  answered && !results[freq] ? 'bg-red-600 text-white' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                没听见
              </button>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span data-testid="ht-progress">
          已测 {testedCount} / {HEARING_FREQS.length}
        </span>
        <button
          type="button"
          data-testid="ht-restart"
          onClick={restart}
          className="rounded bg-slate-200 px-3 py-1 dark:bg-slate-700"
        >
          重新测试
        </button>
      </div>
      {done && (
        <p data-testid="ht-result" className="text-sm font-medium">
          {summarizeHearing(results)}
        </p>
      )}
    </div>
  )
}
