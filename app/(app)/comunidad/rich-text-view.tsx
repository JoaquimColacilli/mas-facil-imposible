'use client'

import { useMemo } from 'react'
import DOMPurify from 'isomorphic-dompurify'
import { cn } from '@/lib/utils'

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'u',
  's',
  'code',
  'pre',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'ul',
  'ol',
  'li',
  'hr',
  'a',
  'span',
]

const ALLOWED_ATTR = ['href', 'rel', 'target', 'style', 'class']

interface Props {
  /** HTML output of the Tiptap editor, or legacy plain text. */
  html: string
  className?: string
  /** Extra typographic tightness for inline/compact contexts. */
  variant?: 'default' | 'compact'
}

function sanitize(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Force external links to open safely.
    ADD_ATTR: ['target', 'rel'],
  })
}

export function RichTextView({ html, className, variant = 'default' }: Props) {
  const trimmed = html.trim()
  const isHtml = trimmed.startsWith('<')

  const safeHtml = useMemo(() => (isHtml ? sanitize(trimmed) : ''), [
    isHtml,
    trimmed,
  ])

  // Legacy plain-text posts: render preserving line breaks.
  if (!isHtml) {
    return (
      <p
        className={cn(
          'whitespace-pre-line',
          variant === 'compact'
            ? 'text-sm leading-relaxed text-foreground/75'
            : 'text-[15px] leading-relaxed text-foreground/85',
          className,
        )}
      >
        {html}
      </p>
    )
  }

  return (
    <div
      className={cn(
        'rich-text',
        variant === 'compact'
          ? 'rich-text-compact text-foreground/75'
          : 'text-foreground/85',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  )
}
