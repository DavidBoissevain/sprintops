// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { sanitizeRichText } from '../../../pages/backlog/rich-text.ts'

const parse = (html: string) => {
  const container = document.createElement('div')
  container.innerHTML = sanitizeRichText(html)
  return container
}

describe('sanitizeRichText', () => {
  it('keeps normal formatting', () => {
    const html = '<p>One <b>two</b></p><ul><li>three</li></ul>'

    expect(sanitizeRichText(html)).toBe(html)
  })

  it('removes scripts, event handlers and script links', () => {
    const result = sanitizeRichText(
      '<script>alert(1)</script><p onclick="alert(2)">text</p><a href="javascript:alert(3)">link</a><img src="x" onerror="alert(4)">',
    )

    expect(result).not.toMatch(/script|onclick|onerror|alert/i)
    expect(result).toContain('text')
  })

  it('removes frames, forms and styles with their content', () => {
    const result = sanitizeRichText('<iframe src="https://evil.test"></iframe><style>p{color:red}</style><form action="/x"><p>kept</p></form>')

    expect(result).toBe('<p>kept</p>')
  })

  it('drops inline styling but keeps the text', () => {
    const container = parse('<div style="color: red"><font face="Arial">font</font> <button style="x">button</button></div>')

    expect(container.querySelector('font, button, [style]')).toBeNull()
    expect(container.textContent).toBe('font button')
  })

  it('holds back remote images, so the browser never loads them itself', () => {
    const image = parse('<img src="https://dev.azure.com/org/image.png" alt="Plan">').querySelector('img')

    expect(image?.hasAttribute('src')).toBe(false)
    expect(image?.dataset.src).toBe('https://dev.azure.com/org/image.png')
    expect(image?.alt).toBe('Plan')
  })

  it('ignores a data-src written in the HTML itself', () => {
    const image = parse('<img data-src="https://evil.test/a.png" alt="x">').querySelector('img')

    expect(image?.hasAttribute('data-src')).toBe(false)
  })

  it('keeps embedded raster images and drops other sources', () => {
    const embedded = 'data:image/png;base64,iVBORw0KGgo='

    expect(parse(`<img src="${embedded}">`).querySelector('img')?.getAttribute('src')).toBe(embedded)

    for (const src of ['data:image/svg+xml;base64,PHN2Zz4=', '/relative.png', '//evil.test/a.png', 'blob:https://evil.test/a']) {
      const image = parse(`<img src="${src}">`).querySelector('img')
      expect(image?.hasAttribute('src')).toBe(false)
      expect(image?.hasAttribute('data-src')).toBe(false)
    }
  })

  it('turns mentions into plain text', () => {
    const link = parse('<a href="#" data-vss-mention="version:2.0,guid">@Anna</a>').querySelector('a')

    expect(link?.hasAttribute('href')).toBe(false)
    expect(link?.hasAttribute('data-vss-mention')).toBe(false)
    expect(link?.textContent).toBe('@Anna')
  })

  it('opens links in a new tab', () => {
    const link = parse('<a href="https://example.test" target="_self">site</a>').querySelector('a')

    expect(link?.target).toBe('_blank')
    expect(link?.rel).toBe('noopener noreferrer')
  })
})
