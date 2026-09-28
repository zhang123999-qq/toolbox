import { expect, test } from '@playwright/test'

test.describe('svg-to-png SVG 转 PNG (#453)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/svg-to-png')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/SVG 转 PNG/)
  })

  test('投放区与选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-width')).toBeVisible()
    await expect(page.getByTestId('opt-height')).toBeVisible()
    await expect(page.getByTestId('opt-background')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('SVG 转 PNG')
    await page.getByText('SVG 转 PNG', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/svg-to-png/)
  })
})
