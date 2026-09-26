/**
 * file-hash E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('file-hash', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/file-hash')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/文件哈希/)
  })

  test('示例 → 运行 → 输出 MD5 与 SHA-256', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('run').click()
    const out = page.getByTestId('output')
    await expect(out).toContainText('输入：11 字符 / 11 字节', { timeout: 30000 })
    await expect(out).toContainText(/MD5\s+[0-9a-f]{32}/)
  })

  test('文件入口存在且可选文件', async ({ page }) => {
    await expect(page.getByTestId('file')).toBeAttached()
    await page.getByTestId('file').setInputFiles({
      name: 'demo.bin',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from('abc'),
    })
    await expect(page.getByTestId('output')).toContainText('文件：demo.bin', { timeout: 30000 })
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('file-hash')
    await page.getByText('文件哈希').first().click()
    await expect(page).toHaveURL(/\/tools\/file-hash$/)
  })
})
