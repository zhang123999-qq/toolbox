import { expect, test } from '@playwright/test'

test.describe('bulk-password 随机密码批量 (#420)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/bulk-password')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/批量/)
  })

  test('点示例输出 10 条 16 位密码', async ({ page }) => {
    await page.getByTestId('example').click()
    const text = (await page.getByTestId('output').textContent()) ?? ''
    const lines = text.trim().split('\n')
    expect(lines).toHaveLength(10)
    for (const line of lines) expect(line).toHaveLength(16)
  })

  test('有上限与本地生成的说明', async ({ page }) => {
    await expect(page.getByText(/上限 10000 条/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('密码批量')
    await page.getByText('随机密码批量', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/bulk-password/)
  })
})
