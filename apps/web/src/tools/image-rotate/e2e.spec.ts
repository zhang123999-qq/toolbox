import { expect, test } from '@playwright/test'

test.describe('image-rotate 图片旋转 (#423)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/image-rotate')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/图片旋转/)
  })

  test('投放区与选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('btn-rot90')).toBeVisible()
    await expect(page.getByTestId('opt-angle')).toBeVisible()
    await expect(page.getByTestId('opt-format')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('图片旋转')
    await page.getByText('图片旋转', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/image-rotate/)
  })
})
