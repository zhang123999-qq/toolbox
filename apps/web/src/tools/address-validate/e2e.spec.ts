/**
 * address-validate E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('address-validate 地址校验 (#691)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/address-validate')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/地址校验/)
  })

  test('点示例批量校验出结果', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('valid-0')).toContainText('✓ 有效地址')
    await expect(page.getByTestId('valid-2')).toContainText('✗ 无效地址')
  })

  test('非法输入行内报错', async ({ page }) => {
    await page.getByTestId('input').fill('0x1234')
    await page.getByTestId('run').click()
    await expect(page.getByTestId('result-0')).toContainText('地址长度错误')
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('地址校验')
    await page.getByText('地址校验', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/address-validate$/)
  })
})
