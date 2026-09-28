import { expect, test } from '@playwright/test'

test.describe('random-password 随机密码 (#371)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/random-password')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/随机密码/)
  })

  test('点示例输出 16 位密码', async ({ page }) => {
    await page.getByTestId('example').click()
    const text = (await page.getByTestId('output').textContent()) ?? ''
    expect(text.trim()).toMatch(/^[!-~]{16}$/)
  })

  test('非法长度显示错误', async ({ page }) => {
    await page.getByTestId('option-length').fill('999')
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
    await expect(page.getByTestId('output')).toContainText(/密码长度必须在/)
  })

  test('首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('随机密码')
    await page.getByText('随机密码', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/random-password/)
  })
})
