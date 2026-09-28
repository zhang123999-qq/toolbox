/**
 * api-doc E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：A 级工具；E2E 仅校验页面可达与表单元素，不依赖网络。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('API 文档生成 (#756)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/api-doc')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/API 文档生成/)
  })

  test('文档表单元素存在', async ({ page }) => {
    await expect(page.getByTestId('apidoc-title')).toBeVisible()
    await expect(page.getByTestId('apidoc-version')).toBeVisible()
    await expect(page.getByTestId('apidoc-generate')).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('API 文档生成')
    await page.getByText('API 文档生成', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/api-doc$/)
  })
})
