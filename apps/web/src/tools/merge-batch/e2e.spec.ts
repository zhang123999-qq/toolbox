import { expect, test } from '@playwright/test'

test.describe('merge-batch 图片拼接批量 (#474)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/merge-batch')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/图片拼接批量/)
  })

  test('投放区与选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-groupsize')).toBeVisible()
    await expect(page.getByTestId('opt-direction')).toBeVisible()
    await expect(page.getByTestId('opt-gap')).toBeVisible()
    await expect(page.getByTestId('opt-bgcolor')).toBeVisible()
    await expect(page.getByTestId('opt-align')).toBeVisible()
    await expect(page.getByTestId('opt-format')).toBeVisible()
    await expect(page.getByTestId('opt-quality')).toBeVisible()
    await expect(page.getByTestId('process')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('图片拼接批量')
    await page.getByText('图片拼接批量', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/merge-batch/)
  })
})
