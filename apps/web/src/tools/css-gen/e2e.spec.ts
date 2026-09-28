import { expect, test } from '@playwright/test'

test.describe('css-gen CSS 动画生成 (#391)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/css-gen')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/CSS 动画/)
  })

  test('默认输出 bounce 动画', async ({ page }) => {
    await expect(page.getByTestId('output')).toContainText('@keyframes bounce {')
    await expect(page.getByTestId('output')).toContainText('animation: bounce 1s ease;')
  })

  test('未知动画名显示错误', async ({ page }) => {
    await page.getByTestId('input').fill('wiggle')
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
    await expect(page.getByTestId('output')).toContainText(/未知动画预设/)
  })

  test('首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('CSS 动画')
    await page.getByText('CSS 动画生成', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/css-gen/)
  })
})
