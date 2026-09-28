/**
 * alt-gen E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：BYOK 工具；E2E 仅校验页面可达与标题，不发起真实请求。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('图片 Alt 生成 (#731)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/alt-gen')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/图片 Alt 生成/)
  })

  test('BYOK 配置项存在', async ({ page }) => {
    await expect(page.getByTestId('api-key')).toBeVisible()
    await expect(page.getByTestId('image-kind')).toBeVisible()
    await expect(page.getByTestId('image-file')).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('图片 Alt 生成')
    await page.getByText('图片 Alt 生成', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/alt-gen$/)
  })
})
