import { expect, test } from '@playwright/test'

test.describe('image-format 图片格式检测 (#471)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/image-format')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/图片格式检测/)
  })

  test('投放区与检测按钮可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('detect')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('图片格式检测')
    await page.getByText('图片格式检测', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/image-format/)
  })
})
