import { expect, test } from '@playwright/test'

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

test.describe('uuid UUID 生成 (#376)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/uuid')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/UUID/)
  })

  test('点示例输出一个 v4 UUID', async ({ page }) => {
    await page.getByTestId('example').click()
    const text = (await page.getByTestId('output').textContent()) ?? ''
    expect(text.trim()).toMatch(V4)
  })

  test('非法数量显示错误', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('option-count').fill('0')
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
    await expect(page.getByTestId('output')).toContainText(/数量必须在/)
  })

  test('首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('UUID')
    await page.getByText('UUID 生成', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/uuid/)
  })
})
