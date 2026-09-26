/**
 * zxcvbn 的最小类型声明（上游包不带 .d.ts）
 *
 * 只声明 password-strength 工具真正用到的成员；
 * 与 node-forge.d.ts 同一思路：不做全量建模，签名按实际用法给出。
 */
declare module 'zxcvbn' {
  export interface ZxcvbnCrackTimesDisplay {
    online_throttling_100_per_hour: string
    online_no_throttling_10_per_second: string
    offline_slow_hashing_1e4_per_second: string
    offline_fast_hashing_1e10_per_second: string
  }

  export interface ZxcvbnFeedback {
    warning: string
    suggestions: string[]
  }

  export interface ZxcvbnResult {
    score: 0 | 1 | 2 | 3 | 4
    crack_times_display: ZxcvbnCrackTimesDisplay
    feedback: ZxcvbnFeedback
  }

  function zxcvbn(password: string, rankedDictionaries?: unknown): ZxcvbnResult
  export default zxcvbn
}
