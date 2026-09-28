/**
 * file-compare E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('file-compare', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/file-compare')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/文件对比/)
  })

  test('上传两个文件 → 显示差异', async ({ page }) => {
    await page.getByTestId('file-a').setInputFiles({
      name: 'old.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('a\nb\nc\n'),
    })
    await page.getByTestId('file-b').setInputFiles({
      name: 'new.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('a\nB\nc\n'),
    })
    await page.getByTestId('run').click()
    await expect(page.getByTestId('summary')).toContainText('新增', { timeout: 30000 })
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('file-compare')
    await page.getByText('文件对比').first().click()
    await expect(page).toHaveURL(/\/tools\/file-compare$/)
  })
})
