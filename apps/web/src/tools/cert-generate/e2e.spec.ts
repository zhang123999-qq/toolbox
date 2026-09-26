/**
 * cert-generate E2E
 *
 * 前置：pnpm build && pnpm preview && pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('cert-generate', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/cert-generate')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/证书生成/)
  })

  test('填 CN 后运行生成自签名证书', async ({ page }) => {
    await page.getByLabel('通用名（CN）').fill('example.localhost')
    await page.getByTestId('example').click()
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toContainText('BEGIN CERTIFICATE')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('证书生成')
    await page.getByText('证书生成').first().click()
    await expect(page).toHaveURL(/\/tools\/cert-generate$/)
  })
})
