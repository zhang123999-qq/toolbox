/**
 * ecc-encrypt E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('ecc-encrypt', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/ecc-encrypt')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/ECC 加密/)
  })

  test('示例 → 运行 → 输出已知共享密钥', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toHaveText(
      'koUH48K8QJoy6DOIyAFXfpChmIlyRbKhtSbrn03LfL8=',
      { timeout: 15000 },
    )
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('ecc')
    await page.getByText('ECC 加密').first().click()
    await expect(page).toHaveURL(/\/tools\/ecc-encrypt$/)
  })
})
