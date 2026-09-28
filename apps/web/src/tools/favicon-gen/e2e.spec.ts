/**
 * favicon-gen E2E（只写不跑）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('favicon-gen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/favicon-gen')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/Favicon/)
  })

  test('选择非图片文件 → 中文错误提示', async ({ page }) => {
    await page.getByTestId('input').setInputFiles({
      name: 'a.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('dummy'),
    })
    await expect(page.getByRole('alert')).toContainText('请选择图片文件')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('favicon-gen')
    await page.locator('a[href$="/tools/favicon-gen"]').first().click()
    await expect(page).toHaveURL(/\/tools\/favicon-gen$/)
  })
})
