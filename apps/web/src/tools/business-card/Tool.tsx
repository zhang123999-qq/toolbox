import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { BusinessCardInput, BusinessCardOptions } from './schema'

/** 示例：完整的名片 */
const EXAMPLE: BusinessCardInput = {
  text: '陈静',
  title: '高级前端工程师',
  company: '星辰科技有限公司',
  phone: '138-0000-1234',
  email: 'chenjing@example.com',
  website: 'www.example.com',
}

export default function Tool() {
  const t = useTranslate()
  return (
    <TwoColumn<BusinessCardInput, BusinessCardOptions>
      meta={meta}
      initialInput={{ text: '', title: '', company: '', phone: '', email: '', website: '' }}
      initialOptions={{}}
      run={(input) => transform(input, t)}
      example={EXAMPLE}
      extraInputs={[
        { key: 'title', label: t('businessCard.field.title'), rows: 1 },
        { key: 'company', label: t('businessCard.field.company'), rows: 1 },
        { key: 'phone', label: t('businessCard.field.phone'), rows: 1 },
        { key: 'email', label: t('businessCard.field.email'), rows: 1 },
        { key: 'website', label: t('businessCard.field.website'), rows: 1 },
      ]}
    />
  )
}
