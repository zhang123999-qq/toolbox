import { expect, test } from '@playwright/test'

test.describe('image-compare 图片对比 (#449)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/image-compare')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/图片对比/)
  })

  test('两个投放区与选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone-a')).toBeVisible()
    await expect(page.getByTestId('dropzone-b')).toBeVisible()
    await expect(page.getByTestId('opt-mode')).toBeVisible()
    await expect(page.getByTestId('opt-threshold')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('图片对比')
    await page.getByText('图片对比', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/image-compare/)
  })
})
