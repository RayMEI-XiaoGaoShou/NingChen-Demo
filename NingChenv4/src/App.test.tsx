import { describe, expect, it } from 'vitest'
import appSource from './App.tsx?raw'
import coverSource from './components/Cover/Cover.tsx?raw'
import viteConfigSource from '../vite.config.ts?raw'
import { shouldHideGlobalHeader, shouldUseRoundStartFullscreenShell } from './App'

describe('App phase loading contract', () => {
    it('lazy-loads the narrative entry and main round pages', () => {
        expect(appSource).toContain("lazy(() => import('./components/Cover/Cover')")
        expect(appSource).toContain("lazy(() => import('./components/Prologue/Prologue')")
        expect(appSource).toContain("lazy(() => import('./components/CourtView/CourtView')")
        expect(appSource).toContain("lazy(() => import('./components/SchemePanel/SchemePanel')")
        expect(appSource).toContain("lazy(() => import('./components/EmpressReply/EmpressReply')")
        expect(appSource).toContain("lazy(() => import('./components/Settlement/Settlement')")
        expect(appSource).toContain("lazy(() => import('./components/Ending/Ending')")
    })

    it('wraps page rendering in Suspense with a dedicated loading shell', () => {
        expect(appSource).toContain('Suspense fallback={<PhaseLoadingFallback />}')
        expect(appSource).toContain('app-phase-loading')
        expect(appSource).toContain('正在展开这一页')
    })

    it('keeps the cover structure and controls in the cover component source', () => {
        expect(coverSource).toContain('cover-page')
        expect(coverSource).toContain('cover-action')
        expect(coverSource).toContain('cover-audio-control')
        expect(coverSource).toContain('cover-subtitle')
    })

    it('defines stable manual chunk groups for React and the main phase clusters', () => {
        expect(viteConfigSource).toContain('manualChunks')
        expect(viteConfigSource).toContain('react-vendor')
        expect(viteConfigSource).toContain('phase-entry')
        expect(viteConfigSource).toContain('phase-core-loop')
        expect(viteConfigSource).toContain('phase-resolution')
    })
})

describe('App shell helpers', () => {
    it('enables the compact RoundStart shell for every in-game round start', () => {
        expect(shouldUseRoundStartFullscreenShell('INGAME', 'ROUND_START', 1)).toBe(true)
        expect(shouldUseRoundStartFullscreenShell('INGAME', 'ROUND_START', 2)).toBe(true)
        expect(shouldUseRoundStartFullscreenShell('INGAME', 'ROUND_START', 20)).toBe(true)
        expect(shouldUseRoundStartFullscreenShell('INGAME', 'PROLOGUE', 1)).toBe(true)
    })

    it('keeps the standard shell for cover, prologue, and non-round-start phases', () => {
        expect(shouldUseRoundStartFullscreenShell('COVER', 'ROUND_START', 1)).toBe(false)
        expect(shouldUseRoundStartFullscreenShell('PROLOGUE', 'ROUND_START', 1)).toBe(false)
        expect(shouldUseRoundStartFullscreenShell('INGAME', 'COURT_OBSERVE', 1)).toBe(false)
    })

    it('hides the global header for in-game and narrative entry pages', () => {
        expect(shouldHideGlobalHeader('INGAME', 'ROUND_START')).toBe(true)
        expect(shouldHideGlobalHeader('PROLOGUE', 'ROUND_START')).toBe(true)
        expect(shouldHideGlobalHeader('INGAME', 'COURT_OBSERVE')).toBe(true)
        expect(shouldHideGlobalHeader('INGAME', 'SCHEME_PHASE')).toBe(true)
        expect(shouldHideGlobalHeader('INGAME', 'EMPRESS_LETTER')).toBe(true)
        expect(shouldHideGlobalHeader('INGAME', 'SCHEME_FEEDBACK')).toBe(true)
        expect(shouldHideGlobalHeader('INGAME', 'EMPRESS_REPLY')).toBe(true)
        expect(shouldHideGlobalHeader('INGAME', 'SETTLEMENT')).toBe(true)
        expect(shouldHideGlobalHeader('INGAME', 'ROUND_END')).toBe(true)
        expect(shouldHideGlobalHeader('INGAME', 'ROUND_START_LEGACY')).toBe(true)
        expect(shouldHideGlobalHeader('UNKNOWN_STEP', 'ROUND_START_LEGACY')).toBe(true)
        expect(shouldHideGlobalHeader('PROLOGUE', 'PROLOGUE')).toBe(true)
        expect(shouldHideGlobalHeader('GAMEPLAY_GUIDE', 'PROLOGUE')).toBe(true)
        expect(shouldHideGlobalHeader('CHARACTER_BIOS', 'PROLOGUE')).toBe(true)
        expect(shouldHideGlobalHeader('INGAME', 'ENDING')).toBe(false)
    })
})
