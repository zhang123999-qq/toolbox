import { expect, test } from '@playwright/test'

test.describe('image-to-base64 图片转 Base64 (#475)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/image-to-base64')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/图片转 Base64/)
  })

  test('投放区与输出形式选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-kind')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('图片转 Base64')
    await page.getByText('图片转 Base64', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/image-to-base64/)
  })
})
