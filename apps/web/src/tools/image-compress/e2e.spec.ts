import { expect, test } from '@playwright/test'

test.describe('image-compress 图片压缩 (#421)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/image-compress')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/图片压缩/)
  })

  test('投放区与选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-format')).toBeVisible()
    await expect(page.getByTestId('opt-quality')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('图片压缩')
    await page.getByText('图片压缩', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/image-compress/)
  })
})
