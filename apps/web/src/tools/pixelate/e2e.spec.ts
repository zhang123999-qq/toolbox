import { expect, test } from '@playwright/test'

test.describe('pixelate 像素化 (#450)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pixelate')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/像素化/)
  })

  test('投放区与选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-pixelsize')).toBeVisible()
    await expect(page.getByTestId('opt-format')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('像素化')
    await page.getByText('像素化', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/pixelate/)
  })
})
