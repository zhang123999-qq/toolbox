import { expect, test } from '@playwright/test'

test.describe('saturation 饱和度调整 (#437)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/saturation')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/饱和度/)
  })

  test('投放区与选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-format')).toBeVisible()
    await expect(page.getByTestId('opt-saturation')).toBeVisible()
  })

  test('有 ctx.filter 浏览器支持说明', async ({ page }) => {
    await expect(page.getByText(/Safari 18/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('饱和度')
    await page.getByText('饱和度调整', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/saturation/)
  })
})
