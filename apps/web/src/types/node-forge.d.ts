/**
 * node-forge 的最小类型声明（上游包不带 .d.ts，见各工具的动态 import）
 *
 * 只声明真正用到的成员；签名刻意放宽，因为 forge 的对象模型层次很深，
 * 全量建模既没必要也会失真。
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'node-forge' {
  const forge: {
    pem: {
      decode(input: string): Array<{ type: string; body: string; procType?: unknown }>
      encode(message: unknown, options?: unknown): string
    }
    pki: {
      certificateFromPem(pem: string): any
      certificateToPem(cert: any): string
      certificationRequestFromPem(pem: string): any
      certificationRequestToPem(csr: any): string
      privateKeyFromPem(pem: string): any
      privateKeyToPem(key: any): string
      publicKeyFromPem(pem: string): any
      publicKeyToPem(key: any): string
      createCertificate(): any
      createCertificationRequest(): any
      rsa: {
        generateKeyPair(options?: { bits?: number; e?: number }): {
          publicKey: any
          privateKey: any
        }
      }
      oids: Record<string, string>
    }
    md: {
      sha1: { create(): any }
      sha256: { create(): any }
      sha384: { create(): any }
      sha512: { create(): any }
    }
    asn1: any
    util: any
  }
  export default forge
}
