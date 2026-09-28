import { expect, test } from '@playwright/test'

test.describe('nanoid NanoID 生成 (#377)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/nanoid')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/NanoID/)
  })

  test('点示例输出 21 位 URL 安全 ID', async ({ page }) => {
    await page.getByTestId('example').click()
    const text = (await page.getByTestId('output').textContent()) ?? ''
    expect(text.trim()).toMatch(/^[A-Za-z0-9_-]{21}$/)
  })

  test('非法长度显示错误', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('option-length').fill('0')
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
    await expect(page.getByTestId('output')).toContainText(/ID 长度必须在/)
  })

  test('首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('NanoID')
    await page.getByText('NanoID 生成', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/nanoid/)
  })
})
