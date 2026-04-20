'use client'

import { useEffect } from 'react'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Placeholder from '@tiptap/extension-placeholder'
import Mention from '@tiptap/extension-mention'
import { useMention } from './use-mention'
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  Strikethrough,
  Code as CodeIcon,
  Code2,
  List,
  ListOrdered,
  Quote,
  Link2,
  Link2Off,
  Palette,
  Heading1,
  Heading2,
  Undo2,
  Redo2,
  Minus,
  RemoveFormatting,
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const COLOR_PALETTE: { label: string; value: string }[] = [
  { label: 'Por defecto', value: '' },
  { label: 'Sage', value: 'oklch(0.50 0.10 155)' },
  { label: 'Cobre', value: 'oklch(0.60 0.10 65)' },
  { label: 'Rojo', value: 'oklch(0.60 0.14 15)' },
  { label: 'Violeta', value: 'oklch(0.55 0.14 295)' },
  { label: 'Cielo', value: 'oklch(0.55 0.12 230)' },
  { label: 'Esmeralda', value: 'oklch(0.55 0.12 155)' },
  { label: 'Gris', value: 'oklch(0.55 0.008 260)' },
]

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
}

/** Converts a legacy plain-text body to HTML so Tiptap preserves line breaks
 *  when opening an old post for edit. HTML inputs pass through untouched. */
function toInitialContent(value: string): string {
  const trimmed = value.trim()
  if (trimmed === '') return ''
  if (trimmed.startsWith('<')) return value
  return value
    .split('\n')
    .map((line) =>
      line.trim() === ''
        ? '<p></p>'
        : `<p>${line
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')}</p>`,
    )
    .join('')
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
}: Props) {
  const { suggestion, popover, containerRef } = useMention()

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
        codeBlock: { HTMLAttributes: { class: 'rich-text-code-block' } },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      TextStyle,
      Color,
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
    content: toInitialContent(value),
    // Avoid "Tiptap will use the DOM to sync" hydration warnings — render
    // the editor on the client only.
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      // Tiptap emits `<p></p>` for an empty doc — treat that as empty string
      // so the composer's "canPublish" check works naturally.
      onChange(html === '<p></p>' ? '' : html)
    },
  })

  // If the editor already exists and the parent passes a completely different
  // `value` (e.g. switching between create/edit modes, reset after publish),
  // sync once. We compare against the current HTML to avoid cursor jumps.
  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    const incoming = toInitialContent(value)
    const normalizedCurrent = current === '<p></p>' ? '' : current
    const normalizedIncoming = incoming.trim() === '' ? '' : incoming
    if (normalizedCurrent !== normalizedIncoming) {
      editor.commands.setContent(normalizedIncoming || '', {
        emitUpdate: false,
      })
    }
  }, [value, editor])

  if (!editor) {
    return (
      <div
        className={cn(
          'rounded-lg border border-border bg-muted/40 h-40',
          className,
        )}
      />
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'rounded-lg border border-border bg-muted/40 focus-within:border-primary focus-within:bg-background transition-colors relative',
        className,
      )}
    >
      <Toolbar editor={editor} />
      <EditorContent
        editor={editor}
        className="rich-text rich-text-editor px-3 py-3 min-h-[160px] max-h-[50vh] overflow-y-auto scrollbar-thin focus:outline-none [&_*:focus]:outline-none"
      />
      {popover}
    </div>
  )
}

interface ToolbarBtnProps {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  label: string
  children: React.ReactNode
}

function TBtn({ onClick, active, disabled, label, children }: ToolbarBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        'w-8 h-8 grid place-items-center rounded transition-colors',
        active
          ? 'bg-primary/15 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        disabled && 'opacity-40 cursor-not-allowed',
      )}
    >
      {children}
    </button>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  const promptLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('URL del enlace', prev ?? 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: url })
      .run()
  }

  const currentColor = (editor.getAttributes('textStyle').color as
    | string
    | undefined) ?? ''

  return (
    <div className="flex items-center gap-0.5 flex-wrap px-2 py-1.5 border-b border-border/60">
      <TBtn
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        label="Negrita"
      >
        <BoldIcon className="w-3.5 h-3.5" />
      </TBtn>
      <TBtn
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        label="Itálica"
      >
        <ItalicIcon className="w-3.5 h-3.5" />
      </TBtn>
      <TBtn
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive('underline')}
        label="Subrayado"
      >
        <UnderlineIcon className="w-3.5 h-3.5" />
      </TBtn>
      <TBtn
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive('strike')}
        label="Tachado"
      >
        <Strikethrough className="w-3.5 h-3.5" />
      </TBtn>

      <span className="w-px h-5 bg-border mx-1" />

      <TBtn
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive('code')}
        label="Código inline"
      >
        <CodeIcon className="w-3.5 h-3.5" />
      </TBtn>
      <TBtn
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        active={editor.isActive('codeBlock')}
        label="Bloque de código"
      >
        <Code2 className="w-3.5 h-3.5" />
      </TBtn>
      <TBtn
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive('blockquote')}
        label="Cita"
      >
        <Quote className="w-3.5 h-3.5" />
      </TBtn>

      <span className="w-px h-5 bg-border mx-1" />

      <TBtn
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        label="Lista"
      >
        <List className="w-3.5 h-3.5" />
      </TBtn>
      <TBtn
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        label="Lista numerada"
      >
        <ListOrdered className="w-3.5 h-3.5" />
      </TBtn>

      <span className="w-px h-5 bg-border mx-1" />

      <TBtn
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 1 }).run()
        }
        active={editor.isActive('heading', { level: 1 })}
        label="Título 1"
      >
        <Heading1 className="w-3.5 h-3.5" />
      </TBtn>
      <TBtn
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
        active={editor.isActive('heading', { level: 2 })}
        label="Título 2"
      >
        <Heading2 className="w-3.5 h-3.5" />
      </TBtn>

      <span className="w-px h-5 bg-border mx-1" />

      <TBtn
        onClick={promptLink}
        active={editor.isActive('link')}
        label="Enlace"
      >
        <Link2 className="w-3.5 h-3.5" />
      </TBtn>
      {editor.isActive('link') && (
        <TBtn
          onClick={() => editor.chain().focus().unsetLink().run()}
          label="Quitar enlace"
        >
          <Link2Off className="w-3.5 h-3.5" />
        </TBtn>
      )}

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            title="Color"
            aria-label="Color"
            className={cn(
              'w-8 h-8 grid place-items-center rounded transition-colors relative',
              currentColor
                ? 'text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Palette className="w-3.5 h-3.5" />
            <span
              className="absolute bottom-1 right-1 w-2 h-2 rounded-sm border border-border"
              style={{
                background: currentColor || 'var(--foreground)',
              }}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-2">
          <div className="grid grid-cols-4 gap-1.5">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => {
                  if (c.value) {
                    editor.chain().focus().setColor(c.value).run()
                  } else {
                    editor.chain().focus().unsetColor().run()
                  }
                }}
                title={c.label}
                aria-label={c.label}
                className={cn(
                  'w-7 h-7 rounded-md border border-border transition-transform hover:scale-110',
                  c.value === currentColor && 'ring-2 ring-primary',
                )}
                style={{
                  background: c.value || 'var(--background)',
                }}
              >
                {!c.value && (
                  <RemoveFormatting className="w-3 h-3 mx-auto text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <TBtn
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        label="Separador"
      >
        <Minus className="w-3.5 h-3.5" />
      </TBtn>

      <TBtn
        onClick={() =>
          editor.chain().focus().unsetAllMarks().clearNodes().run()
        }
        label="Limpiar formato"
      >
        <RemoveFormatting className="w-3.5 h-3.5" />
      </TBtn>

      <span className="flex-1" />

      <TBtn
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        label="Deshacer"
      >
        <Undo2 className="w-3.5 h-3.5" />
      </TBtn>
      <TBtn
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        label="Rehacer"
      >
        <Redo2 className="w-3.5 h-3.5" />
      </TBtn>
    </div>
  )
}
