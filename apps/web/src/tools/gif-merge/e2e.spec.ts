import { expect, test } from '@playwright/test'

test.describe('gif-merge GIF 合成 (#443)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/gif-merge')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/GIF 合成/)
  })

  test('投放区与选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-delay')).toBeVisible()
    await expect(page.getByTestId('opt-repeat')).toBeVisible()
    await expect(page.getByTestId('opt-quality')).toBeVisible()
    await expect(page.getByTestId('merge')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('GIF 合成')
    await page.getByText('GIF 合成', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/gif-merge/)
  })
})
