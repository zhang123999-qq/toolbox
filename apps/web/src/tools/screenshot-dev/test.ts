import { describe, expect, it } from 'vitest'
import { DISPLAY_MEDIA_CONSTRAINTS, frameToPng, isSupported, stopStream } from './utils'

describe('screenshot-dev / 约束与能力探测', () => {
  it('getDisplayMedia 约束只要视频不要音频', () => {
    expect(DISPLAY_MEDIA_CONSTRAINTS.audio).toBe(false)
    expect(DISPLAY_MEDIA_CONSTRAINTS.video).toBeTruthy()
  })

  it('jsdom 环境下不支持 getDisplayMedia', () => {
    expect(isSupported()).toBe(false)
  })
})

describe('screenshot-dev / frameToPng', () => {
  function makeFakeVideo(w: number, h: number): HTMLVideoElement {
    return { videoWidth: w, videoHeight: h } as HTMLVideoElement
  }

  function makeFakeCanvas() {
    const calls: string[] = []
    return {
      el: {
        width: 0,
        height: 0,
        getContext() {
          return {
            drawImage() {
              calls.push('drawImage')
            },
          }
        },
        toDataURL() {
          calls.push('toDataURL')
          return 'data:image/png;base64,AAAA'
        },
      } as unknown as HTMLCanvasElement,
      calls,
    }
  }

  it('正常截帧返回 dataURL', () => {
    const fake = makeFakeCanvas()
    const out = frameToPng(makeFakeVideo(1280, 720), fake.el)
    expect(out).toBe('data:image/png;base64,AAAA')
    expect(fake.calls).toContain('drawImage')
    expect(fake.el.width).toBe(1280)
    expect(fake.el.height).toBe(720)
  })

  it('0 尺寸视频抛错', () => {
    const fake = makeFakeCanvas()
    expect(() => frameToPng(makeFakeVideo(0, 0), fake.el)).toThrow(/未取到视频帧/)
  })
})

describe('screenshot-dev / stopStream', () => {
  it('停止所有轨道', () => {
    const stopped: string[] = []
    const track = { stop: () => stopped.push('x') } as unknown as MediaStreamTrack
    const stream = { getTracks: () => [track, track] } as unknown as MediaStream
    stopStream(stream)
    expect(stopped).toHaveLength(2)
  })
})
