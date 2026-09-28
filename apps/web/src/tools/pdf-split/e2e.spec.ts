import { expect, test } from '@playwright/test'

test.describe('pdf-split PDF 拆分 (#482)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pdf-split')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/PDF 拆分/)
  })

  test('投放区与模式选择可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-mode')).toBeVisible()
    await expect(page.getByTestId('opt-pages')).toBeVisible()
  })

  test('三种模式切换显示对应输入', async ({ page }) => {
    await page.getByTestId('opt-mode').selectOption('chunks')
    await expect(page.getByTestId('opt-chunk')).toBeVisible()
    await expect(page.getByTestId('opt-pages')).toBeHidden()
    await page.getByTestId('opt-mode').selectOption('single')
    await expect(page.getByTestId('opt-chunk')).toBeHidden()
    await expect(page.getByTestId('opt-pages')).toBeHidden()
    await page.getByTestId('opt-mode').selectOption('ranges')
    await expect(page.getByTestId('opt-pages')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('PDF 拆分')
    await page.getByText('PDF 拆分', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/pdf-split/)
  })
})
