export const ALLOWED_TAGS = new Set([
  'P',
  'BR',
  'B',
  'STRONG',
  'I',
  'EM',
  'UL',
  'OL',
  'LI',
  'A',
])

export function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

export function sanitize(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const walk = (node: Element) => {
    for (const el of Array.from(node.children)) {
      walk(el)
      if (!ALLOWED_TAGS.has(el.tagName)) {
        el.replaceWith(...Array.from(el.childNodes))
        continue
      }
      const href = el.tagName === 'A' ? (el.getAttribute('href') ?? '') : ''
      for (const attr of Array.from(el.attributes))
        el.removeAttribute(attr.name)
      if (el.tagName === 'A' && /^https?:\/\//i.test(href)) {
        el.setAttribute('href', href)
        el.setAttribute('rel', 'noopener')
        el.setAttribute('target', '_blank')
      }
    }
  }
  walk(doc.body)
  return doc.body.innerHTML
}
