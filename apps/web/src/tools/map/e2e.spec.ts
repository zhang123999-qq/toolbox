/**
 * map E2E（只写不跑；不依赖真实网络）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('map 地图可视化 (#674)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/map')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/地图可视化/)
  })

  test('点示例后 input 被填入示例', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('input')).toHaveValue(/广东:120/)
  })

  test('非法地区数据显示错误', async ({ page }) => {
    await page.getByTestId('input').fill('只有一行')
    await expect(page.getByRole('alert')).toContainText('格式非法')
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('地图可视化')
    await page.getByText('地图可视化', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/map$/)
  })
})
