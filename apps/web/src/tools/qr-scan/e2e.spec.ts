import { expect, test } from '@playwright/test'

test.describe('qr-scan 二维码识别 (#447)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/qr-scan')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/二维码识别/)
  })

  test('投放区可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('二维码识别')
    await page.getByText('二维码识别', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/qr-scan/)
  })
})
