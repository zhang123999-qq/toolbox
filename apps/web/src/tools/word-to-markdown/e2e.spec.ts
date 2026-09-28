/**
 * word-to-markdown E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 *
 * 说明：本机未安装 Playwright 浏览器（~/.cache/ms-playwright 为空），
 * 该文件只编写不运行。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

/**
 * 最小 docx（二级标题「小节」+ 段落「正文内容」）的 base64。
 * 内嵌 fixture，不引入 fflate，保持 meta.deps=['mammoth'] 精确。
 */
const DOCX_SECTION =
  'UEsDBBQAAAAIAAQMPF3MVIwQ4AAAAJwBAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbH2Qy07DMBBFf8XyFsUOLBBCSbrgsQQW5QNG9iSx8Eset5S/Z9KWLlDbpX0fZ3S71S54scVCLsVe3qpWCowmWRenXn6uX5sHuRq69U9GEmyN1Mu51vyoNZkZA5BKGSMrYyoBKj/LpDOYL5hQ37XtvTYpVoy1qUuHHLpnHGHjq3jZ8fcBW9CTFE8H48LqJeTsnYHKut5G+4/SHAmKk3sPzS7TDRukPktYlMuAY+6ddyjOoviAUt8gsEt/p2K1TWYTOKmu15y5M42jM3jKL225JINEPHDw6qQEcPHvfr2fe/gFUEsDBBQAAAAIAAQMPF02V97cogAAABgBAAALAAAAX3JlbHMvLnJlbHONzzsOwjAMBuCrRN6pCwNCqGkXhNQVlQNEiZtGNA8l4XV7MjBQxMBo+/dnuekedmY3isl4x2Fd1cDISa+M0xzOw3G1g65tTjSLXBJpMiGxsuIShynnsEdMciIrUuUDuTIZfbQilzJqDEJehCbc1PUW46cBS5P1ikPs1RrY8Az0j+3H0Ug6eHm15PKPE1+JIouoKXO4+6hQvdtVYQHbBhcvti9QSwMEFAAAAAgABAw8Xa+vXVrLAAAAFgEAABEAAAB3b3JkL2RvY3VtZW50LnhtbG2Puw6CMBiFX4V0lyKDMYTLZhxN1AeoUIGEtqStIKuJmri4+QLOGlcfCOJj2FZlcjn/7cvJ+f1oSwqrwlzkjAZgaDvAwjRmSU7TACwXk8EYRKFfewmLNwRTaSmeCq8OQCZl6UEo4gwTJGxWYqpua8YJkmrkKawZT0rOYiyEsiMFdB1nBAnKKdCWK5Y0upZGZtyUuWwKbNVehYoATDHSQVwAQx/2jBEZto/z67TTe2muaq2Z3vGLdbdrdzm2h317f/6BlX5yqOb3Y/gGUEsBAhQAFAAAAAgABAw8XcxUjBDgAAAAnAEAABMAAAAAAAAAAAAAAAAAAAAAAFtDb250ZW50X1R5cGVzXS54bWxQSwECFAAUAAAACAAEDDxdNlfe3KIAAAAYAQAACwAAAAAAAAAAAAAAAAARAQAAX3JlbHMvLnJlbHNQSwECFAAUAAAACAAEDDxdr69dWssAAAAWAQAAEQAAAAAAAAAAAAAAAADcAQAAd29yZC9kb2N1bWVudC54bWxQSwUGAAAAAAMAAwC5AAAA1gIAAAAA'

function docxBuffer(): Buffer {
  return Buffer.from(DOCX_SECTION, 'base64')
}

test.describe('word-to-markdown', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/word-to-markdown')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/Word 转 Markdown/)
  })

  test('上传 docx → 输出 Markdown', async ({ page }) => {
    await page.getByTestId('file').setInputFiles({
      name: 'demo.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: docxBuffer(),
    })
    await expect(page.getByTestId('output')).toContainText('## 小节', { timeout: 30000 })
  })

  test('上传损坏的 docx 给出中文错误', async ({ page }) => {
    await page.getByTestId('file').setInputFiles({
      name: 'bad.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: Buffer.from([1, 2, 3]),
    })
    await expect(page.getByTestId('output')).toContainText('文档解析失败', { timeout: 30000 })
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('word-to-markdown')
    await page.getByText('Word 转 Markdown').first().click()
    await expect(page).toHaveURL(/\/tools\/word-to-markdown$/)
  })
})
