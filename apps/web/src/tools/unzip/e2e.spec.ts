/**
 * unzip E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('unzip', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/unzip')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/解压 ZIP/)
  })

  test('文件入口存在且可选 zip', async ({ page }) => {
    await expect(page.getByTestId('file')).toBeAttached()
    // 最小的空 zip（fflate zipSync({}) 的固定输出）
    const emptyZip = Buffer.from([
      0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ])
    await page.getByTestId('file').setInputFiles({
      name: 'empty.zip',
      mimeType: 'application/zip',
      buffer: emptyZip,
    })
    await expect(page.getByTestId('output')).toContainText('压缩包为空', { timeout: 30000 })
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('unzip')
    await page.getByText('解压 ZIP').first().click()
    await expect(page).toHaveURL(/\/tools\/unzip$/)
  })
})
