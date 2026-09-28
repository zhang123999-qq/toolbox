import { expect, test } from '@playwright/test'

test.describe('palette 调色板导出 (#390)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/palette')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/调色板/)
  })

  test('点示例输出 CSS 变量', async ({ page }) => {
    await page.getByTestId('example').click()
    const text = (await page.getByTestId('output').textContent()) ?? ''
    expect(text).toContain(':root {')
    expect(text).toContain('--color-1:')
  })

  test('非法颜色显示错误', async ({ page }) => {
    await page.getByTestId('input').fill('notacolor')
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
    await expect(page.getByTestId('output')).toContainText(/无法解析的颜色/)
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('调色板')
    await page.getByText('调色板导出', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/palette/)
  })
})
