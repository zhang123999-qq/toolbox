/**
 * private-key E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('private-key 私钥生成 (#692)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/private-key')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/私钥生成/)
  })

  test('默认生成 5 个私钥', async ({ page }) => {
    const text = await page.getByTestId('output').textContent()
    const lines = text!.split('\n').filter((l) => l.length > 0)
    expect(lines).toHaveLength(5)
    for (const l of lines) expect(l).toMatch(/^0x[0-9a-f]{64}$/)
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('私钥生成')
    await page.getByText('私钥生成', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/private-key$/)
  })
})
