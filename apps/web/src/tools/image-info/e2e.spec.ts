import { expect, test } from '@playwright/test'

test.describe('image-info 图片元信息 (#467)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/image-info')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/图片元信息/)
  })

  test('投放区可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('图片元信息')
    await page.getByText('图片元信息', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/image-info/)
  })
})
