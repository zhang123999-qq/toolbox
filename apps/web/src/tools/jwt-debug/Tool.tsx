import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { JwtDebugInput, JwtDebugOptions } from './schema'

const EXAMPLE: JwtDebugInput = {
  text: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IuW3peWFt-W6kyIsImlhdCI6MTUxNjIzOTAyMiwiZXhwIjo5OTk5OTk5OTk5OX0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
}

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<JwtDebugOptions>[] = [
    {
      key: 'secret',
      label: t('option.secret'),
      kind: 'text',
      placeholder: 'HMAC 密钥（验 HS 签名用）',
    },
    {
      key: 'publicKeyPem',
      label: '公钥（PEM）',
      kind: 'textarea',
      placeholder: '-----BEGIN PUBLIC KEY-----（验 RS/ES 签名用）',
    },
  ]

  return (
    <TwoColumn<JwtDebugInput, JwtDebugOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ secret: '', publicKeyPem: '' }}
      runAsync={transform}
      idleText="粘贴 JWT 后点「运行」解码；可选填密钥校验签名，全程在本地完成"
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
