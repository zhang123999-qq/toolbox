/**
 * tilemap E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：A 级工具；E2E 仅校验页面可达与表单元素，编辑在本地完成。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('瓦片地图 (#788)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/tilemap')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/瓦片地图/)
  })

  test('画布与新建按钮可见', async ({ page }) => {
    await expect(page.getByTestId('tilemap-canvas')).toBeVisible()
    await expect(page.getByTestId('tilemap-new')).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('瓦片地图')
    await page.getByText('瓦片地图', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/tilemap$/)
  })
})
