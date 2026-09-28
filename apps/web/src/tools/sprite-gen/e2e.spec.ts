import { expect, test } from '@playwright/test'

test.describe('sprite-gen 雪碧图生成 (#455)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/sprite-gen')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/雪碧图/)
  })

  test('投放区与选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-direction')).toBeVisible()
    await expect(page.getByTestId('opt-columns')).toBeVisible()
    await expect(page.getByTestId('opt-gap')).toBeVisible()
    await expect(page.getByTestId('opt-format')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('雪碧图')
    await page.getByText('雪碧图', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/sprite-gen/)
  })
})
