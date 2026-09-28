import { expect, test } from '@playwright/test'

test.describe('color-adjust 调色 (#435)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/color-adjust')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/调色/)
  })

  test('投放区与选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-temperature')).toBeVisible()
    await expect(page.getByTestId('opt-tint')).toBeVisible()
    await expect(page.getByTestId('opt-exposure')).toBeVisible()
    await expect(page.getByTestId('opt-format')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('调色')
    await page.getByText('调色', { exact: true }).first().click()
    await expect(page.getByTestId('opt-temperature')).toBeVisible()
  })
})
