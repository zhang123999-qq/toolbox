// @vitest-environment jsdom
/**
 * GitHub 仓库链接的行为测试
 *
 * 覆盖三件事：
 *  1. 指向 https://github.com/zhang123999-qq/toolbox
 *  2. 新窗口打开（target=_blank + rel=noopener）
 *  3. 中英文 aria-label 均有值（双语无障碍名）
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { AppProviders } from '../../providers'
import { GitHubLink } from './GitHubLink'
import { LOCALE_STORAGE_KEY } from '../../lib/prefs'

const GITHUB_URL = 'https://github.com/zhang123999-qq/toolbox'

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

function renderLink() {
  render(
    <AppProviders>
      <GitHubLink />
    </AppProviders>,
  )
  return screen.getByTestId('github-link') as HTMLAnchorElement
}

describe('GitHubLink', () => {
  it('指向仓库地址并在新窗口打开', () => {
    const link = renderLink()
    expect(link.getAttribute('href')).toBe(GITHUB_URL)
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('中文下有中文无障碍名', () => {
    const link = renderLink()
    expect(link.getAttribute('aria-label')).toBe('GitHub 仓库')
    expect(link.getAttribute('title')).toBe('GitHub 仓库')
  })

  it('英文下有英文无障碍名', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en')
    const link = renderLink()
    expect(link.getAttribute('aria-label')).toBe('GitHub repository')
  })
})
