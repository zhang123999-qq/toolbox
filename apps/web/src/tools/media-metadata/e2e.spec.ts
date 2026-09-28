/**
 * media-metadata E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('media-metadata', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/media-metadata')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/媒体元数据/)
  })

  test('未知格式文件 → 中文错误提示', async ({ page }) => {
    await page.getByTestId('file').setInputFiles({
      name: 'x.bin',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from([1, 2, 3, 4]),
    })
    await expect(page.getByTestId('error')).toContainText('无法识别的文件格式')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('media-metadata')
    await page.getByText('媒体元数据').first().click()
    await expect(page).toHaveURL(/\/tools\/media-metadata$/)
  })
})
