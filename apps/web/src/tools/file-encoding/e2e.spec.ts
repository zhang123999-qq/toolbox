/**
 * file-encoding E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('file-encoding', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/file-encoding')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/文件编码检测/)
  })

  test('上传文本文件 → 输出检测结果', async ({ page }) => {
    await page.getByTestId('file').setInputFiles({
      name: 'a.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello world'),
    })
    await expect(page.getByTestId('output')).toContainText('检测结果：ASCII', { timeout: 30000 })
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('file-encoding')
    await page.getByText('文件编码检测').first().click()
    await expect(page).toHaveURL(/\/tools\/file-encoding$/)
  })
})
