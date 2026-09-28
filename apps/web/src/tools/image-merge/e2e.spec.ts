import { expect, test } from '@playwright/test'

test.describe('image-merge 图片拼接 (#439)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/image-merge')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/图片拼接/)
  })

  test('投放区与选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-direction')).toBeVisible()
    await expect(page.getByTestId('opt-gap')).toBeVisible()
    await expect(page.getByTestId('opt-format')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('图片拼接')
    await page.getByText('图片拼接', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/image-merge/)
  })
})
