/**
 * postman-import E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：纯前端工具；E2E 仅校验页面可达与默认解析结果，不发起网络请求。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('Postman 导入 (#751)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/postman-import')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/Postman 导入/)
  })

  test('默认示例解析出请求列表', async ({ page }) => {
    await expect(page.getByTestId('collection-summary')).toContainText('共 2 个请求')
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('Postman 导入')
    await page.getByText('Postman 导入', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/postman-import$/)
  })
})
