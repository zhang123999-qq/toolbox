import { expect, test } from '@playwright/test'

test.describe('passphrase-gen 密码短语生成 (#419)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/passphrase-gen')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/密码短语/)
  })

  test('点示例输出 4 词短语', async ({ page }) => {
    await page.getByTestId('example').click()
    const text = (await page.getByTestId('output').textContent()) ?? ''
    expect(text.trim()).toMatch(/^([a-z]+-){3}[a-z]+$/)
  })

  test('有与随机密码区分的说明', async ({ page }) => {
    await expect(page.getByText(/多个英文单词组成的易记短语/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('密码短语')
    await page.getByText('密码短语生成', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/passphrase-gen/)
  })
})
