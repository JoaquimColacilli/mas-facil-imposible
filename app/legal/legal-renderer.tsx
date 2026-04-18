// Minimal markdown renderer for the controlled, hand-written legal texts.
// Supports: # H1, ## H2, *italic*, **bold**, - bullets, blank-line paragraphs.
// Intentionally narrow — do NOT use for user-generated content.

import { Fragment } from 'react'

function renderInline(text: string, key: number) {
  // Split by **bold** and *italic* while preserving the markers.
  const parts: React.ReactNode[] = []
  let remaining = text
  let i = 0
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(remaining)) !== null) {
    if (match.index > lastIndex) {
      parts.push(remaining.slice(lastIndex, match.index))
    }
    const token = match[0]
    if (token.startsWith('**')) {
      parts.push(<strong key={`${key}-${i++}`}>{token.slice(2, -2)}</strong>)
    } else {
      parts.push(<em key={`${key}-${i++}`}>{token.slice(1, -1)}</em>)
    }
    lastIndex = match.index + token.length
  }
  if (lastIndex < remaining.length) {
    parts.push(remaining.slice(lastIndex))
  }
  return parts.length === 0 ? text : parts
}

export function LegalRenderer({ text }: { text: string }) {
  const lines = text.split('\n')
  const blocks: React.ReactNode[] = []
  let currentList: string[] | null = null
  let currentParagraph: string[] | null = null
  let key = 0

  function flushList() {
    if (currentList) {
      const items = currentList
      blocks.push(
        <ul key={`ul-${key++}`} className="list-disc pl-5 space-y-1.5 my-3 text-foreground/90 leading-relaxed">
          {items.map((item, i) => (
            <li key={i}>{renderInline(item, key * 100 + i)}</li>
          ))}
        </ul>,
      )
      currentList = null
    }
  }

  function flushParagraph() {
    if (currentParagraph) {
      const joined = currentParagraph.join(' ')
      blocks.push(
        <p key={`p-${key++}`} className="my-3 text-foreground/90 leading-relaxed">
          {renderInline(joined, key * 100)}
        </p>,
      )
      currentParagraph = null
    }
  }

  function flushAll() {
    flushList()
    flushParagraph()
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()

    if (line.startsWith('# ')) {
      flushAll()
      blocks.push(
        <h1 key={`h1-${key++}`} className="text-2xl font-bold tracking-tight mt-2 mb-4 text-foreground">
          {renderInline(line.slice(2), key * 100)}
        </h1>,
      )
    } else if (line.startsWith('## ')) {
      flushAll()
      blocks.push(
        <h2 key={`h2-${key++}`} className="text-base font-semibold mt-7 mb-2 text-foreground">
          {renderInline(line.slice(3), key * 100)}
        </h2>,
      )
    } else if (line.startsWith('*') && line.endsWith('*') && !line.startsWith('**')) {
      // Standalone italic line (the version stamp)
      flushAll()
      blocks.push(
        <p key={`em-${key++}`} className="text-sm text-muted-foreground italic mb-6">
          {line.slice(1, -1)}
        </p>,
      )
    } else if (line.startsWith('- ')) {
      flushParagraph()
      if (!currentList) currentList = []
      currentList.push(line.slice(2))
    } else if (line === '') {
      flushAll()
    } else {
      flushList()
      if (!currentParagraph) currentParagraph = []
      currentParagraph.push(line)
    }
  }
  flushAll()

  return <article className="text-[15px]">{blocks.map((b, i) => <Fragment key={i}>{b}</Fragment>)}</article>
}
