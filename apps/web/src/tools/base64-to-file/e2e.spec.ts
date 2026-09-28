/**
 * base64-to-file E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('base64-to-file', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/base64-to-file')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/Base64 转文件/)
  })

  test('示例 → 运行 → 输出解码报告', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toContainText('解码成功', { timeout: 30000 })
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('base64-to-file')
    await page.getByText('Base64 转文件').first().click()
    await expect(page).toHaveURL(/\/tools\/base64-to-file$/)
  })
})
