import { useState } from 'react'
import { meta } from './meta'
import {
  checkPitchAnswer,
  newPitchTrial,
  PITCH_ANSWERS,
  playTone,
  scorePitchTrials,
  type AudioContextFactory,
  type PitchAnswer,
  type PitchTrial,
} from './utils'

const TRIALS = 5

const realFactory: AudioContextFactory = () => {
  const Ctor: typeof AudioContext | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  return Ctor ? new Ctor() : null
}

export default function Tool() {
  const [trial, setTrial] = useState<PitchTrial>(() => newPitchTrial())
  const [round, setRound] = useState(1)
  const [results, setResults] = useState<boolean[]>([])
  const [playing, setPlaying] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastOk, setLastOk] = useState<boolean | null>(null)

  const done = results.length >= TRIALS

  const play = async (which: 'first' | 'second') => {
    setError(null)
    setPlaying(which)
    try {
      await playTone(realFactory, which === 'first' ? trial.freq1 : trial.freq2, 600)
    } catch (e) {
      setError(e instanceof Error ? e.message : '播放失败')
    } finally {
      setPlaying(null)
    }
  }

  const answer = (a: PitchAnswer) => {
    const ok = checkPitchAnswer(trial, a)
    setLastOk(ok)
    const next = [...results, ok]
    setResults(next)
    if (next.length < TRIALS) {
      setTrial(newPitchTrial())
      setRound((r) => r + 1)
    }
  }

  const restart = () => {
    setTrial(newPitchTrial())
    setRound(1)
    setResults([])
    setLastOk(null)
    setError(null)
  }

  const { correct, total, rate } = scorePitchTrials(results)

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">{meta.title}</h2>
      <p className="text-sm text-slate-500">
        共 {TRIALS} 题：先听第一个音，再听第二个音，判断第二个音相对第一个音是更高、更低还是相同。
      </p>
      {error && (
        <p data-testid="pt-error" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {!done ? (
        <>
          <p data-testid="pt-round" className="text-sm">
            第 {round} / {TRIALS} 题
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="pt-play1"
              onClick={() => void play('first')}
              disabled={playing !== null}
              className="rounded bg-blue-600 px-4 py-1 text-sm text-white disabled:opacity-50"
            >
              {playing === 'first' ? '播放中…' : '播放第一个音'}
            </button>
            <button
              type="button"
              data-testid="pt-play2"
              onClick={() => void play('second')}
              disabled={playing !== null}
              className="rounded bg-blue-600 px-4 py-1 text-sm text-white disabled:opacity-50"
            >
              {playing === 'second' ? '播放中…' : '播放第二个音'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {PITCH_ANSWERS.map((a) => (
              <button
                key={a.value}
                type="button"
                data-testid={`pt-answer-${a.value}`}
                onClick={() => answer(a.value)}
                className="rounded bg-slate-200 px-4 py-1 text-sm dark:bg-slate-700"
              >
                {a.label}
              </button>
            ))}
          </div>
          {lastOk !== null && (
            <p data-testid="pt-feedback" className={`text-sm ${lastOk ? 'text-green-600' : 'text-red-600'}`}>
              {lastOk ? '答对了！' : '答错了，再听下一题'}
            </p>
          )}
        </>
      ) : (
        <div data-testid="pt-result" className="text-sm">
          <p>
            答对 {correct} / {total}，正确率 {rate}
          </p>
          <button
            type="button"
            data-testid="pt-restart"
            onClick={restart}
            className="mt-2 rounded bg-slate-200 px-3 py-1 dark:bg-slate-700"
          >
            再测一次
          </button>
        </div>
      )}
    </div>
  )
}
