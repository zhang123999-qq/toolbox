import { expect, test } from '@playwright/test'

test.describe('color-extract 图片主色提取 (#456)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/color-extract')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/图片主色提取/)
  })

  test('投放区与选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-count')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('图片主色提取')
    await page.getByText('图片主色提取', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/color-extract/)
  })
})
