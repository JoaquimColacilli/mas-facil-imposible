'use client'

import { useEffect, useImperativeHandle, forwardRef } from 'react'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Mention from '@tiptap/extension-mention'
import { cn } from '@/lib/utils'
import { useMention } from './use-mention'

interface Props {
  value: string
  onChange: (html: string) => void
  /** Optional Ctrl/Cmd+Enter submit binding. Receives current HTML. */
  onSubmit?: (html: string) => void
  placeholder?: string
  className?: string
  minHeight?: number
}

export interface InlineEditorRef {
  focus: () => void
  clear: () => void
  getEditor: () => Editor | null
}

/** Minimal Tiptap editor for comment/reply boxes — no formatting toolbar,
 *  only paragraph text + @mentions + placeholder. Stores HTML so mentions
 *  can round-trip through the DB. */
export const InlineEditor = forwardRef<InlineEditorRef, Props>(
  function InlineEditor(
    { value, onChange, onSubmit, placeholder, className, minHeight = 64 },
    ref,
  ) {
    const { suggestion, popover, containerRef } = useMention()

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          // Comments are short — strip bigger block types.
          heading: false,
          blockquote: false,
          codeBlock: false,
          horizontalRule: false,
          bulletList: false,
          orderedList: false,
          listItem: false,
        }),
        Mention.configure({
          HTMLAttributes: { class: 'mention', 'data-type': 'mention' },
          renderText: ({ node }) =>
            `@${node.attrs.label ?? node.attrs.id ?? 'usuario'}`,
          suggestion,
        }),
        Placeholder.configure({
          placeholder: placeholder ?? 'Escribí algo…',
        }),
      ],
      content: value || '',
      immediatelyRender: false,
      onUpdate: ({ editor }) => {
        const html = editor.getHTML()
        onChange(html === '<p></p>' ? '' : html)
      },
      editorProps: {
        handleKeyDown: (_view, event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            if (onSubmit && editor) {
              const html = editor.getHTML()
              onSubmit(html === '<p></p>' ? '' : html)
              return true
            }
          }
          return false
        },
      },
    })

    // Controlled reset — let the parent clear after submit.
    useEffect(() => {
      if (!editor) return
      const current = editor.getHTML()
      const normalizedCurrent = current === '<p></p>' ? '' : current
      if (normalizedCurrent !== value) {
        editor.commands.setContent(value || '', { emitUpdate: false })
      }
    }, [value, editor])

    useImperativeHandle(
      ref,
      () => ({
        focus: () => editor?.commands.focus(),
        clear: () => editor?.commands.clearContent(true),
        getEditor: () => editor,
      }),
      [editor],
    )

    return (
      <div
        ref={containerRef}
        className={cn(
          'rich-text rich-text-editor text-[14px] px-0 py-0 focus:outline-none [&_*:focus]:outline-none relative',
          className,
        )}
        style={{ minHeight }}
      >
        <EditorContent editor={editor} />
        {popover}
      </div>
    )
  },
)
