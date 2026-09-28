import { expect, test } from '@playwright/test'

test.describe('image-hash 图片哈希 (#468)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/image-hash')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/图片哈希/)
  })

  test('两个投放区可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone-a')).toBeVisible()
    await expect(page.getByTestId('dropzone-b')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('图片哈希')
    await page.getByText('图片哈希', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/image-hash/)
  })
})
