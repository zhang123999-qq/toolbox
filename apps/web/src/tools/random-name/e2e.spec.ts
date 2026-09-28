import { expect, test } from '@playwright/test'

test.describe('random-name 随机人名 (#374)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/random-name')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/随机人名/)
  })

  test('点示例输出 1 个非空名字', async ({ page }) => {
    await page.getByTestId('example').click()
    const text = (await page.getByTestId('output').textContent()) ?? ''
    expect(text.trim().length).toBeGreaterThanOrEqual(2)
  })

  test('数量填 0 显示错误', async ({ page }) => {
    await page.getByTestId('option-count').fill('0')
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
    await expect(page.getByTestId('output')).toContainText(/数量必须为 1 到 50/)
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('随机人名')
    await page.getByText('随机人名', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/random-name/)
  })
})
