/**
 * file-to-base64 E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('file-to-base64', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/file-to-base64')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/文件转 Base64/)
  })

  test('示例 → 运行 → 输出 Base64', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toContainText('aGVsbG8gd29ybGQ=', { timeout: 30000 })
  })

  test('文件入口存在且可选文件', async ({ page }) => {
    await expect(page.getByTestId('file')).toBeAttached()
    await page.getByTestId('file').setInputFiles({
      name: 'a.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello'),
    })
    await expect(page.getByTestId('output')).toContainText('文件：a.txt', { timeout: 30000 })
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('file-to-base64')
    await page.getByText('文件转 Base64').first().click()
    await expect(page).toHaveURL(/\/tools\/file-to-base64$/)
  })
})
