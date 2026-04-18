import type { Metadata } from 'next'
import { PRIVACY_TEXT, PRIVACY_VERSION, PRIVACY_DATE } from '@/lib/legal-texts'
import { LegalRenderer } from '../legal-renderer'

export const metadata: Metadata = {
  title: 'Política de Privacidad — MFI',
  description: 'Política de privacidad de MFI (Más Fácil Imposible).',
}

export default function PrivacyPage() {
  return (
    <>
      <LegalRenderer text={PRIVACY_TEXT} />
      <footer className="mt-12 pt-6 border-t border-border/60 text-xs text-muted-foreground">
        Versión {PRIVACY_VERSION} — {PRIVACY_DATE}
      </footer>
    </>
  )
}
