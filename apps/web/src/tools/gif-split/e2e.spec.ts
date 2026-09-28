import { expect, test } from '@playwright/test'

test.describe('gif-split GIF 分解 (#442)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/gif-split')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/GIF 分解/)
  })

  test('投放区与逐个保存说明可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('download-all-note')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('GIF 分解')
    await page.getByText('GIF 分解', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/gif-split/)
  })
})
