import { expect, test } from '@playwright/test'

test.describe('pdf-to-image-extract PDF 提取图片 (#494)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pdf-to-image-extract')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/PDF 提取图片/)
  })

  test('投放区与格式选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-format')).toBeVisible()
  })

  test('有本地处理说明与和整页渲染的区别说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
    await expect(page.getByText(/内嵌/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('PDF 提取图片')
    await page.getByText('PDF 提取图片', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/pdf-to-image-extract/)
  })
})
