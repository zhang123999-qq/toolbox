import { expect, test } from '@playwright/test'

test.describe('short-id 短 ID 生成 (#379)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/short-id')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/短 ID/)
  })

  test('点示例输出 8 位字母数字短 ID', async ({ page }) => {
    await page.getByTestId('example').click()
    const text = (await page.getByTestId('output').textContent()) ?? ''
    expect(text.trim()).toMatch(/^[A-Za-z0-9]{8}$/)
  })

  test('非法长度显示错误', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('option-length').fill('0')
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
    await expect(page.getByTestId('output')).toContainText(/短 ID 长度必须在/)
  })

  test('首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('短 ID')
    await page.getByText('短 ID 生成', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/short-id/)
  })
})
