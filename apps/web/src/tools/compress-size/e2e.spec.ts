import { expect, test } from '@playwright/test'

test.describe('compress-size 压缩到指定大小 (#460)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/compress-size')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/压缩到指定大小/)
  })

  test('投放区与选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-format')).toBeVisible()
    await expect(page.getByTestId('opt-target')).toBeVisible()
    await expect(page.getByTestId('process')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('压缩到指定大小')
    await page.getByText('压缩到指定大小', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/compress-size/)
  })
})
