/**
 * X.509 / PEM 展示用的共用纯函数与演示证书。
 *
 * PEM 解析（#? pem-parse）与 SSL 证书体检（#130）都要把证书主题属性格式化成
 * `CN=…, O=…`、计算有效期天数、共用一张演示证书。按 DEVELOPMENT.md §8.4
 * 「工具之间禁止互相 import，共用逻辑一律上提到 lib」放这里。
 *
 * 这里不含任何加解密逻辑，只有文本格式化与一个公开的自签名演示证书。
 */

/**
 * 内置演示证书（自签发，2024-01-01 → 2034-01-01，RSA 2048）。
 * 供「示例」与单测共用：只做解析演示，**不要**拿它当任何真实凭据。
 */
export const DEMO_CERTIFICATE = `-----BEGIN CERTIFICATE-----
MIIDkDCCAnigAwIBAgIBATANBgkqhkiG9w0BAQsFADBuMRswGQYDVQQDExJkZW1v
LnRvb2xib3gubG9jYWwxCzAJBgNVBAYTAkNOMRAwDgYDVQQIEwdCZWlqaW5nMRAw
DgYDVQQHEwdCZWlqaW5nMRAwDgYDVQQKEwdUb29sYm94MQwwCgYDVQQLEwNEZXYw
HhcNMjQwMTAxMDAwMDAwWhcNMzQwMTAxMDAwMDAwWjBuMRswGQYDVQQDExJkZW1v
LnRvb2xib3gubG9jYWwxCzAJBgNVBAYTAkNOMRAwDgYDVQQIEwdCZWlqaW5nMRAw
DgYDVQQHEwdCZWlqaW5nMRAwDgYDVQQKEwdUb29sYm94MQwwCgYDVQQLEwNEZXYw
ggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDslnm8r7ZHSkNmGXqtxASK
/2WzE3d2HSr+6PKy2MvHOFOxH4Qw6nnFRiDO7ZFButy2k9JHhviC3UL1dEUGza9X
ejm69xGNTZHMhYPcWSf6tGGWOMEij6I4Qte57jZCOkvBbkuZt340VU2OgSOcTiDk
1PTlHNow1Y8ARAefndQjlCCQ6jko4S+vELcJHbmY2j1qT94R0usiX5M6MZTW6ih5
z7H6eXUzoHZfF8M/mZy05s0EZU2sSGHZkTaQWCjVtXIDN609v7NuklLcvyY54xSl
h3HHJOF4TQ4JVHyXAt9rFyeJ+5ZgeZix+pWBSGBOdtDvtfCfejGkD4wzirIXNtSN
AgMBAAGjOTA3MAkGA1UdEwQCMAAwCwYDVR0PBAQDAgWgMB0GA1UdEQQWMBSCEmRl
bW8udG9vbGJveC5sb2NhbDANBgkqhkiG9w0BAQsFAAOCAQEAfL8LgAFB9fmt//KA
3Yo0GcZKHu0VPS/ctR3ODlZLsdOWrrJiXFXT9CnjVQNX0p0YlMYnBnAyxuuVvVV/
6I9Gmi+4u6XOAQit64hg0drdCs2JtNGRNISvn08hFc8Ucblna7PwrtiQtJVTAK1K
dwGuZGFHYpFYAPWXXIZzRwd5m666cGDYg/GB9yKaN5kvgQeViTyOS8k5EMxr/4BD
9jfYpXLhUy5hQY1lxIZarDjVFyFo4z67RdUzq0RG/fr/BrBMeD/yyG2+JE/5m1cZ
kpmNEqFSj+fHuJKBvQ9+mW0fg0Ara7dGmqyBws2pj+4LjIsv9YhuAhonyHk0IqVy
lfCZ7w==
-----END CERTIFICATE-----
`

/** 常见 OID 名的缩写 */
function shortNameOf(name: string): string {
  const table: Record<string, string> = {
    commonName: 'CN',
    countryName: 'C',
    stateOrProvinceName: 'ST',
    localityName: 'L',
    organizationName: 'O',
    organizationalUnitName: 'OU',
  }
  return table[name] ?? name
}

/** subject / issuer 的属性数组 → `CN=xxx, O=yyy` */
export function formatAttrs(attributes: readonly unknown[]): string {
  const parts: string[] = []
  for (const attribute of attributes) {
    const item = attribute as { name?: string; shortName?: string; type?: string; value?: string }
    const key = item.shortName ?? shortNameOf(item.name ?? item.type ?? '?')
    const value = typeof item.value === 'string' ? item.value : String(item.value ?? '')
    parts.push(`${key}=${value}`)
  }
  return parts.join(', ')
}

/** 天数差（用于「还剩多少天过期」），按毫秒整除 */
export function daysBetween(from: number, to: number): number {
  return Math.floor((to - from) / 86_400_000)
}
