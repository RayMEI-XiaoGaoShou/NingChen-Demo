import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
// @ts-expect-error Vitest runs this source contract in Node; the app tsconfig omits Node types.
import { readFileSync } from 'fs'
import { OpeningCinematic, OPENING_CINEMATIC_VIDEO_SRC } from './OpeningCinematic'
import openingCinematicSource from './OpeningCinematic.tsx?raw'

const openingCinematicCss = readFileSync(new URL('./OpeningCinematic.css', import.meta.url), 'utf8')

describe('OpeningCinematic', () => {
    it('renders the confirmed opening video as a full-screen cinematic', () => {
        const markup = renderToStaticMarkup(<OpeningCinematic onComplete={() => undefined} />)

        expect(OPENING_CINEMATIC_VIDEO_SRC).toBe('/videos/ningchen-opening-20260623-web.mp4')
        expect(markup).toContain(`src="${OPENING_CINEMATIC_VIDEO_SRC}"`)
        expect(markup).toContain('opening-cinematic-page')
        expect(markup).toContain('opening-cinematic-video')
        expect(markup).toContain('preload="auto"')
        expect(markup).toContain('片头载入中')
        expect(openingCinematicCss).toContain('position: fixed')
        expect(openingCinematicCss).toContain('inset: 0')
        expect(openingCinematicCss).toContain('object-fit: cover')
    })

    it('allows the deployed opening video source to be swapped without changing game code', () => {
        expect(openingCinematicSource).toContain('VITE_OPENING_CINEMATIC_VIDEO_SRC')
        expect(openingCinematicSource).toContain('/videos/ningchen-opening-20260623-web.mp4')
    })

    it('asks for confirmation on screen click without pausing the video', () => {
        expect(openingCinematicSource).toContain('setShowSkipConfirm(true)')
        expect(openingCinematicSource).toContain('确认跳过')
        expect(openingCinematicSource).toContain('是')
        expect(openingCinematicSource).toContain('否')
        expect(openingCinematicSource).toContain('onEnded={completeCinematic}')
        expect(openingCinematicSource).not.toContain('.pause()')
    })

    it('actively starts playback and shows a manual play affordance if autoplay is blocked', () => {
        expect(openingCinematicSource).toContain('video.play()')
        expect(openingCinematicSource).toContain('setPlaybackBlocked(true)')
        expect(openingCinematicSource).toContain('点击播放')
    })

    it('keeps opening playback on the native video path so StrictMode cannot double-bind Web Audio', () => {
        expect(openingCinematicSource).not.toContain('createMediaElementSource')
        expect(openingCinematicSource).not.toContain('AudioContext')
        expect(openingCinematicSource).not.toContain('OPENING_CINEMATIC_AUDIO_GAIN')
    })
})
