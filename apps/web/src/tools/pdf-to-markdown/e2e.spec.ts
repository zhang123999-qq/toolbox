/**
 * pdf-to-markdown E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('pdf-to-markdown', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/pdf-to-markdown')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/PDF 转 Markdown/)
  })

  test('文件入口存在且可选文件', async ({ page }) => {
    await expect(page.getByTestId('file')).toBeAttached()
  })

  test('上传非 PDF 文件给出中文错误提示', async ({ page }) => {
    await page.getByTestId('file').setInputFiles({
      name: 'note.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello'),
    })
    await expect(page.getByTestId('output')).toContainText('请选择 PDF 文件', { timeout: 15000 })
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('pdf-to-markdown')
    await page.getByText('PDF 转 Markdown').first().click()
    await expect(page).toHaveURL(/\/tools\/pdf-to-markdown$/)
  })
})
