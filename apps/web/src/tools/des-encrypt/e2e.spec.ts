/**
 * des-encrypt E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('des-encrypt', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/des-encrypt')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/DES 加密/)
  })

  test('示例 → 运行 → 输出为 `<iv>.<密文>` 形式的密文', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).not.toBeEmpty()
    await expect(page.getByTestId('output')).toHaveText(/^[A-Za-z0-9+/]+=*\.[A-Za-z0-9+/]+=*$/)
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('des-encrypt')
    await page.getByText('DES 加密').first().click()
    await expect(page).toHaveURL(/\/tools\/des-encrypt$/)
  })
})
