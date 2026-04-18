import type { Metadata } from 'next'
import { TOS_TEXT, TOS_VERSION, TOS_DATE } from '@/lib/legal-texts'
import { LegalRenderer } from '../legal-renderer'

export const metadata: Metadata = {
  title: 'Términos y Condiciones — MFI',
  description: 'Términos y condiciones de uso de MFI (Más Fácil Imposible).',
}

export default function TosPage() {
  return (
    <>
      <LegalRenderer text={TOS_TEXT} />
      <footer className="mt-12 pt-6 border-t border-border/60 text-xs text-muted-foreground">
        Versión {TOS_VERSION} — {TOS_DATE}
      </footer>
    </>
  )
}
