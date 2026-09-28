import { expect, test } from '@playwright/test'

test.describe('compress-compare 图片压缩对比 (#470)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/compress-compare')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/图片压缩对比/)
  })

  test('投放区、6 组方案开关与对比按钮可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('compare')).toBeVisible()
    for (const id of ['jpeg-q90', 'jpeg-q70', 'jpeg-q50', 'webp-q80', 'webp-q60', 'png']) {
      const box = page.getByTestId(`scheme-${id}`)
      await expect(box).toBeVisible()
      await expect(box).toBeChecked()
    }
  })

  test('未上传时无结果区', async ({ page }) => {
    await expect(page.getByTestId('result')).toHaveCount(0)
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('图片压缩对比')
    await page.getByText('图片压缩对比', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/compress-compare/)
  })
})
