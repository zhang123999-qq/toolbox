import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('captcha 图形验证码 (#383)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/captcha')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/图形验证码/)
  })

  test('canvas 与刷新按钮存在', async ({ page }) => {
    await expect(page.getByTestId('captcha-canvas')).toBeVisible()
    await expect(page.getByTestId('refresh')).toBeVisible()
  })

  test('点刷新后 canvas 仍在', async ({ page }) => {
    await page.getByTestId('refresh').click()
    await expect(page.getByTestId('captcha-canvas')).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByPlaceholder(/搜索/).fill('验证码')
    await page.getByText('图形验证码', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/captcha/)
  })
})
