import DOMPurify from 'dompurify'

const allowedTags = [
  'p', 'div', 'br', 'span', 'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'ul', 'ol', 'li', 'a', 'img', 'code', 'pre',
  'blockquote', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
]
const allowedAttributes = ['href', 'src', 'alt', 'width', 'height', 'data-vss-mention']
const embeddedImage = /^data:image\/(png|jpeg|gif|webp)[;,]/i
const remoteUrl = /^https?:/i

// The browser must not load a remote image itself: most need the PAT, and an
// untrusted URL must not be fetched at all. RichText loads them from `data-src`.
function holdBackImage(image: Element) {
  const src = image.getAttribute('src')
  if (!src || embeddedImage.test(src)) return

  image.removeAttribute('src')
  if (remoteUrl.test(src)) image.setAttribute('data-src', src)
}

// Azure DevOps writes @mentions as links to "#", which lead nowhere here.
function prepareLink(link: Element, isMention: boolean) {
  if (isMention) {
    link.removeAttribute('href')
  } else if (link.hasAttribute('href')) {
    link.setAttribute('target', '_blank')
    link.setAttribute('rel', 'noopener noreferrer')
  }
}

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  const isMention = node.hasAttribute('data-vss-mention')
  node.removeAttribute('data-vss-mention')

  if (node.nodeName === 'IMG') holdBackImage(node)
  if (node.nodeName === 'A') prepareLink(node, isMention)
})

// Work item HTML is untrusted (decision D12). Inline styles go too, because the
// CSP blocks them anyway and the text then takes on the app's own look.
export function sanitizeRichText(html: string) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: allowedAttributes,
    // Its value, "version:2.0,<id>", would otherwise be rejected as an unknown URL scheme.
    ADD_URI_SAFE_ATTR: ['data-vss-mention'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  })
}
