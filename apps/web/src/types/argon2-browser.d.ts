/**
 * argon2-browser 的类型声明（上游包不带 .d.ts，见 utils.ts 里的动态 import）
 *
 * 只声明本工具真正用到的三个成员：ArgonType / hash / verify。
 */
declare module 'argon2-browser' {
  export interface Argon2HashParams {
    /** 待哈希的口令 */
    pass: string
    /** 盐：任意字符串或字节，建议 16 字节 */
    salt: string | Uint8Array
    /** 时间代价 t（迭代次数） */
    time: number
    /** 内存代价 m（KiB） */
    mem: number
    /** 并行度 p */
    parallelism: number
    /** 输出哈希长度（字节） */
    hashLen: number
    /** 变体：0=Argon2d / 1=Argon2i / 2=Argon2id */
    type: number
  }

  export interface Argon2HashResult {
    hash: Uint8Array
    hashHex: string
    /** PHC 串，形如 $argon2id$v=19$m=19456,t=2,p=1$…$… */
    encoded: string
  }

  export interface Argon2VerifyParams {
    pass: string
    encoded: string
  }

  const argon2: {
    ArgonType: { Argon2d: number; Argon2i: number; Argon2id: number }
    hash(params: Argon2HashParams): Promise<Argon2HashResult>
    verify(params: Argon2VerifyParams): Promise<void>
  }

  export default argon2
}
