/**
 * wallet-connect E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('wallet-connect 钱包连接 (#708)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/wallet-connect')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/钱包连接/)
  })

  test('无钱包时点击提示安装', async ({ page }) => {
    await page.getByTestId('connect').click()
    await expect(page.getByTestId('output')).toContainText('未检测到浏览器钱包')
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('钱包连接')
    await page.getByText('钱包连接', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/wallet-connect$/)
  })
})
