import { useEffect, useMemo, useRef } from 'react'
import { cn } from '@/lib/utils'
import { sanitizeRichText } from './rich-text.ts'

interface RichTextProps {
  html: string
  loadAttachment: (url: string) => Promise<Blob>
  className?: string
}

export function RichText({ html, loadAttachment, className }: RichTextProps) {
  const element = useRef<HTMLDivElement>(null)
  const sanitized = useMemo(() => sanitizeRichText(html), [html])

  useEffect(() => {
    const objectUrls: string[] = []
    let cancelled = false

    // A failed image keeps no source, so the browser shows its alt text.
    async function load(image: HTMLImageElement) {
      try {
        const objectUrl = URL.createObjectURL(await loadAttachment(image.dataset.src ?? ''))
        objectUrls.push(objectUrl)
        if (!cancelled) image.src = objectUrl
      } catch {
        // Nothing more to show.
      }
    }

    element.current?.querySelectorAll<HTMLImageElement>('img[data-src]').forEach((image) => void load(image))

    return () => {
      cancelled = true
      objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl))
    }
  }, [sanitized, loadAttachment])

  return <div ref={element} className={cn('rich-text', className)} dangerouslySetInnerHTML={{ __html: sanitized }} />
}
