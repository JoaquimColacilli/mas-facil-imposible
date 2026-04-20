'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import type {
  SuggestionOptions,
  SuggestionProps,
  SuggestionKeyDownProps,
} from '@tiptap/suggestion'
import { createClient } from '@/lib/supabase/client'
import { MentionList, type MentionItem, type MentionListRef } from './mention-list'

type Command = (attrs: { id: string; label: string }) => void

interface PopoverState {
  items: MentionItem[]
  loading: boolean
  query: string
  /** Offsets relative to the container returned via `containerRef`, NOT
   *  the viewport. Using absolute positioning inside a known-relative
   *  parent avoids the Radix Dialog `translate(-50%, -50%)` trap that
   *  breaks `position: fixed` inside the modal. */
  top: number
  left: number
  command: Command
}

/**
 * Mention plumbing without DOM surgery: returns a Tiptap `suggestion` config
 * and a JSX `popover` node the caller renders inside its editor wrapper.
 *
 * Rendering inside the editor's React subtree avoids three failure modes
 * of the "portal to document.body" approach:
 *  1. Radix Dialog neutralising sibling elements (aria-hidden + focus lock)
 *  2. React synthetic events not firing on detached DOM roots
 *  3. Focus scope pulling the caret back mid-click, which collapses the
 *     suggestion range before `command()` can insert the mention.
 */
export function useMention() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const listRef = useRef<MentionListRef>(null)
  const [state, setState] = useState<PopoverState | null>(null)
  const supabase = useMemo(() => createClient(), [])
  // Guards against out-of-order results when the user types fast.
  const queryTokenRef = useRef(0)

  const runFetch = useCallback(
    async (query: string, command: Command, caretRect: DOMRect) => {
      const token = ++queryTokenRef.current
      const parentRect = containerRef.current?.getBoundingClientRect()
      // Viewport → container-local coords. If no container (edge case),
      // fall back to viewport coords and position: fixed.
      const top = parentRect
        ? Math.round(caretRect.bottom - parentRect.top + 6)
        : Math.round(caretRect.bottom + 6)
      const left = parentRect
        ? Math.round(caretRect.left - parentRect.left)
        : Math.round(caretRect.left)

      setState({
        items: [],
        loading: true,
        query,
        top,
        left,
        command,
      })

      const { data: authRes } = await supabase.auth.getUser()
      const selfId = authRes?.user?.id ?? null

      let builder = supabase
        .from('profiles_public')
        .select('id, username, nickname, avatar_url, karma')
        .limit(8)

      if (query.trim().length > 0) {
        const q = `%${query}%`
        builder = builder.or(`username.ilike.${q},nickname.ilike.${q}`)
      }

      const { data, error } = await builder
      if (token !== queryTokenRef.current) return
      if (error || !data) {
        setState((s) => (s ? { ...s, items: [], loading: false } : s))
        return
      }
      const items = (data as MentionItem[]).filter((u) => u.id !== selfId)
      setState((s) => (s ? { ...s, items, loading: false } : s))
    },
    [supabase],
  )

  const suggestion = useMemo<Omit<SuggestionOptions, 'editor'>>(() => {
    return {
      char: '@',
      allowSpaces: false,
      startOfLine: false,
      // Mention.configure({ suggestion }) does a SHALLOW merge, so the
      // default `command` from the Mention extension is discarded. We must
      // re-declare it here or clicks insert nothing.
      command: ({ editor, range, props }) => {
        editor
          .chain()
          .focus()
          .insertContentAt(range, [
            { type: 'mention', attrs: props },
            { type: 'text', text: ' ' },
          ])
          .run()
      },
      items: () => [],
      render: () => {
        let lastCommand: Command | null = null
        return {
          onStart: (props: SuggestionProps) => {
            lastCommand = props.command as unknown as Command
            const rect = props.clientRect?.()
            if (!rect) return
            void runFetch(props.query, lastCommand, rect)
          },
          onUpdate: (props: SuggestionProps) => {
            lastCommand = props.command as unknown as Command
            const rect = props.clientRect?.()
            if (!rect) return
            void runFetch(props.query, lastCommand, rect)
          },
          onKeyDown: (props: SuggestionKeyDownProps) => {
            if (props.event.key === 'Escape') {
              setState(null)
              return true
            }
            return listRef.current?.onKeyDown(props) ?? false
          },
          onExit: () => {
            queryTokenRef.current++
            setState(null)
            lastCommand = null
          },
        }
      },
    }
  }, [runFetch])

  const popover =
    state !== null ? (
      <div
        // Prevent the editor from blurring when the user clicks inside the
        // popover — that blur would collapse the suggestion range before
        // `command()` lands. Both mousedown and pointerdown are intercepted
        // so desktop and touch both work.
        onMouseDown={(e) => {
          e.preventDefault()
        }}
        onPointerDown={(e) => {
          e.preventDefault()
        }}
        style={{
          position: 'absolute',
          top: state.top,
          left: state.left,
          zIndex: 50,
          pointerEvents: 'auto',
        }}
      >
        <MentionList
          ref={listRef}
          items={state.items}
          loading={state.loading}
          query={state.query}
          command={state.command}
        />
      </div>
    ) : null

  return { suggestion, popover, containerRef }
}
