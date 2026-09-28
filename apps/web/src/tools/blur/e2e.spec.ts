import { expect, test } from '@playwright/test'

test.describe('blur 图片模糊 (#432)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/blur')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/模糊/)
  })

  test('投放区与选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-radius')).toBeVisible()
    await expect(page.getByTestId('opt-format')).toBeVisible()
  })

  test('有本地处理与浏览器支持说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
    await expect(page.getByText(/Safari 18/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('模糊')
    await page.getByText('图片模糊', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/blur/)
  })
})
