import { beforeEach, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { DowagerCreationPage, DowagerReviewPageView } from './DowagerOffering'
import { useGameStore } from '../../stores/gameStore'

const fsSpecifier: string = 'fs'
const { readFileSync } = await import(fsSpecifier)
const dowagerCreationSource = readFileSync(new URL('./DowagerOffering.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const dowagerCreationStyles = readFileSync(new URL('./DowagerOffering.css', import.meta.url), 'utf8').replace(/\r\n/g, '\n')

function resetDowagerPageState() {
    useGameStore.getState().resetGame()
    useGameStore.setState({
        prologueStep: 'INGAME',
        currentRound: 1,
        currentPhase: 'DOWAGER_CREATION',
        schemeCount: 3,
        maxSchemes: 3,
        dowagerFavor: 70,
        pendingDowagerOffering: null,
        dowagerOfferingRecords: [],
    })
}

function submitPaintingForReview() {
    useGameStore.getState().submitDowagerOffering({
        medium: 'painting',
        selections: {
            scene: { presetOptionIds: ['painting.scene.forestFlowers', 'painting.scene.rainCourtyard'] },
            motif: { presetOptionIds: ['painting.motif.redPetals', 'painting.motif.eastFlowingWater', 'painting.motif.tears', 'painting.motif.coldRain'] },
            intent: { presetOptionIds: ['painting.intent.beautyCannotStay', 'painting.intent.waterNeverReturns'] },
        },
        styleReferenceId: 'ink',
    })
}

describe('DowagerOffering pages', () => {
    beforeEach(() => {
        resetDowagerPageState()
    })

    it('renders the creation page as the unselected dowager painting stage', () => {
        const markup = renderToStaticMarkup(<DowagerCreationPage />)

        expect(markup).toContain('太后雅好')
        expect(markup).toContain('玩法测试提示')
        expect(markup).toContain('北周太后每奇数回合会写一首诗词')
        expect(markup).toContain('画作由 Seedream 生成')
        expect(markup).toContain('音乐由 MiniMax Music 2.6 生成')
        expect(markup).toContain('该玩法正在开发，仅开放首回合作画玩法和第二回合画作验收，见谅！')
        expect(markup).toContain('好感度')
        expect(markup).toContain('70')
        expect(markup).toContain('个人安危')
        expect(markup).toContain('眷顾尚隆')
        expect(markup).toContain('相见欢·林花谢了春红')
        expect(markup).toContain('林花谢了春红，太匆匆。')
        expect(markup).toContain('作画')
        expect(markup).toContain('谱曲')
        expect(markup).toContain('开始创作')
        expect(markup).toContain('/images/dowager-offering/dowager-portrait-v2.webp')
        expect(markup).not.toContain('/images/dowager-offering/dowager-portrait.webp')
        expect(markup).toContain('/images/dowager-offering/dowager-scroll.webp')
        expect(markup).toContain('dowager-medium-button')
        expect(markup).toContain('dowager-submit')
        expect(markup).not.toContain('定景')
        expect(markup).not.toContain('景物')
        expect(markup).not.toContain('立意')
        expect(markup).not.toContain('择器')
        expect(markup).not.toContain('/images/dowager-style-references/style-gongbi-watercolor.webp')
        expect(markup).not.toContain('/images/dowager-style-references/style-xieyi-watercolor.webp')
        expect(markup).not.toContain('/images/dowager-style-references/style-ink-wash.webp')
        expect(markup).not.toContain('李煜')
        expect(markup).not.toContain('分数')
        expect(markup).not.toContain('预览')
    })

    it('keeps the new painting-flow states, labels, and art-backed assets in the creation source', () => {
        expect(dowagerCreationSource).toContain("useState<DowagerOfferingMedium | null>(null)")
        expect(dowagerCreationSource).toContain("useState<'idle' | 'style' | 'compose'>('idle')")
        expect(dowagerCreationSource).toContain("setPaintingStep('style')")
        expect(dowagerCreationSource).toContain("setPaintingStep('compose')")
        expect(dowagerCreationSource).toContain('返回画风选择')
        expect(dowagerCreationSource).toContain('const musicCategories = poem.mediums.music.categories')
        expect(dowagerCreationSource).toContain('const musicSelections = selectionsByMedium.music')
        expect(dowagerCreationSource).toContain('className="dowager-music-grid"')
        expect(dowagerCreationSource).toContain("renderCategory('music', category, musicSelections[category.id]")
        expect(dowagerCreationSource).toContain('submitDowagerOffering({')
        expect(dowagerCreationSource).toContain("medium: 'music'")
        expect(dowagerCreationSource).not.toContain('dowager-music-placeholder')
        expect(dowagerCreationSource).toContain('水彩工笔')
        expect(dowagerCreationSource).toContain('水彩写意')
        expect(dowagerCreationSource).toContain('抒情水墨')
        expect(dowagerCreationSource).toContain('/images/dowager-style-references/style-gongbi-watercolor.webp')
        expect(dowagerCreationSource).toContain('/images/dowager-style-references/style-xieyi-watercolor.webp')
        expect(dowagerCreationSource).toContain('/images/dowager-style-references/style-ink-wash.webp')
        expect(dowagerCreationSource).toContain('style.imageSrc')
    })

    it('uses the dowager art stage, empress button assets, and 16:9 PC canvas in creation CSS', () => {
        expect(dowagerCreationStyles).toContain("url('/images/dowager-offering/dowager-bg.webp')")
        expect(dowagerCreationStyles).toContain("url('/images/ui/empress-letter/empress-letter-option.webp')")
        expect(dowagerCreationStyles).toContain("url('/images/ui/empress-letter/empress-letter-submit.webp')")
        expect(dowagerCreationStyles).toContain('aspect-ratio: 16 / 9;')
        expect(dowagerCreationStyles).toContain('width: min(100dvw, calc(100dvh * 16 / 9));')
        expect(dowagerCreationStyles).toContain('height: min(100dvh, calc(100dvw * 9 / 16));')
        expect(dowagerCreationSource).toContain('className="dowager-submit-label"')
        expect(dowagerCreationStyles).toContain('aspect-ratio: 1711 / 616;')
        expect(dowagerCreationStyles).toContain('height: auto;')
        expect(dowagerCreationStyles).toContain('.dowager-submit-label')
        expect(dowagerCreationStyles).not.toContain('height: 7.05cqh;')
        expect(dowagerCreationStyles).toContain('width: 88%;')
        expect(dowagerCreationStyles).toContain('height: 6.35cqh;')
        expect(dowagerCreationStyles).toContain('.dowager-style-card:hover')
        expect(dowagerCreationStyles).toContain('scale(1.08)')
        expect(dowagerCreationStyles).toContain('.dowager-compose-layout')
        expect(dowagerCreationStyles).toContain('.dowager-music-grid')
        expect(dowagerCreationStyles).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));')
        expect(dowagerCreationStyles).toContain('.dowager-music-grid .dowager-category')
        expect(dowagerCreationStyles).toContain('--dowager-compose-panel-height: 54.86cqh;')
        expect(dowagerCreationStyles).toContain('grid-template-rows: auto auto;')
        expect(dowagerCreationStyles).toContain('.dowager-compose-left {\n    display: contents;')
        expect(dowagerCreationStyles).toContain('.dowager-category-stack {\n    grid-column: 1;\n    grid-row: 2;')
        expect(dowagerCreationStyles).toContain('grid-template-rows: repeat(3, minmax(0, 1fr));')
        expect(dowagerCreationStyles).toContain('height: var(--dowager-compose-panel-height);')
        expect(dowagerCreationStyles).toContain('justify-self: start;')
        expect(dowagerCreationStyles).toContain('.dowager-selected-style {\n    grid-column: 2;\n    grid-row: 2;')
        expect(dowagerCreationStyles).toContain('grid-template-rows: minmax(0, 1fr) 4.35cqh;')
        expect(dowagerCreationStyles).toContain('.dowager-selected-style img {\n    min-height: 0;')
        expect(dowagerCreationStyles).toContain('background: linear-gradient(180deg, #f4d86e 0%, #d8b74f 100%);')
        expect(dowagerCreationStyles).toContain('color: rgba(28, 17, 7, 0.98);')
        expect(dowagerCreationStyles).toContain('background: rgba(239, 228, 204, 0.62);')
        expect(dowagerCreationStyles).toContain('border: 1px solid rgba(174, 138, 88, 0.42);')
    })

    it('defines the painting review scene, converted assets, and artwork modal affordance', () => {
        expect(dowagerCreationSource).toContain('const DOWAGER_REVIEW_ASSETS')
        expect(dowagerCreationSource).toContain('/images/dowager-offering/dowager-review-bg.webp')
        expect(dowagerCreationSource).toContain('/images/dowager-offering/dowager-review-portrait.webp')
        expect(dowagerCreationSource).toContain('function getReviewArtworkSrc')
        expect(dowagerCreationSource).toContain('mediaTask.resultImageSrc')
        expect(dowagerCreationSource).toContain("activeMedium === 'painting'")
        expect(dowagerCreationSource).toContain('setArtworkDialogOpen')
        expect(dowagerCreationSource).toContain('dowager-offering-review-painting')
        expect(dowagerCreationSource).toContain('dowager-review-artwork-button')
        expect(dowagerCreationSource).toContain('dowager-review-artwork-modal')
        expect(dowagerCreationSource).toContain('role="dialog"')
        expect(dowagerCreationSource).toContain('dowager-review-comment-panel')
        expect(dowagerCreationSource).toContain('dowager-review-portrait-bleed')
        expect(dowagerCreationSource).toContain('dowager-review-portrait-proxy')

        expect(dowagerCreationStyles).toContain("url('/images/dowager-offering/dowager-review-bg.webp')")
        expect(dowagerCreationStyles).toContain('.dowager-review-frame')
        expect(dowagerCreationStyles).toContain('.dowager-review-portrait')
        expect(dowagerCreationStyles).toContain('.dowager-review-artwork-modal')
        expect(dowagerCreationStyles).toContain('.dowager-review-artwork-modal-button img')
        expect(dowagerCreationStyles).toContain('.dowager-review-artwork-hint')
        expect(dowagerCreationStyles).toContain('animation: dowagerReviewHintPulse')
        expect(dowagerCreationStyles).toContain('.dowager-review-scroll-poem {\n    top: 6cqh;')
        expect(dowagerCreationStyles).toContain('background: rgba(239, 228, 204, 0.62);')
        expect(dowagerCreationStyles).toContain('.dowager-review-portrait-bleed')
        expect(dowagerCreationStyles).toContain('.dowager-review-portrait-proxy')
        expect(dowagerCreationStyles).toContain('.dowager-offering-review-painting .dowager-submit')
        expect(dowagerCreationStyles).toContain('.dowager-offering-review-painting .dowager-submit {\n    position: absolute;')
        expect(dowagerCreationStyles).toContain('color: #342115;')
    })

    it('keeps the dowager portrait cropped, HUD readable, and poem scroll typeset like a hanging calligraphy work', () => {
        expect(dowagerCreationSource).toContain('className="dowager-scroll-title"')
        expect(dowagerCreationSource).toContain('className="dowager-scroll-body"')
        expect(dowagerCreationSource).toContain('className="dowager-portrait-bleed"')
        expect(dowagerCreationSource).toContain('className="dowager-portrait-proxy"')
        expect(dowagerCreationStyles).toContain('.dowager-portrait-bleed')
        expect(dowagerCreationStyles).toContain('overflow: visible;')
        expect(dowagerCreationStyles).toContain('.dowager-portrait-proxy')
        expect(dowagerCreationStyles).toContain('transform: translate(-50%, -50%);')
        expect(dowagerCreationStyles).toContain('left: -18cqw;')
        expect(dowagerCreationStyles).toContain('bottom: -23.6cqh;')
        expect(dowagerCreationStyles).toContain('height: 108cqh;')
        expect(dowagerCreationStyles).toContain('font-size: clamp(0.92rem, 0.72rem + 0.34vw, 1.12rem);')
        expect(dowagerCreationStyles).toContain('font-size: clamp(1.02rem, 0.78rem + 0.38vw, 1.2rem);')
        expect(dowagerCreationStyles).toContain('grid-template-columns: 2.2cqw repeat(4, 1.55cqw);')
        expect(dowagerCreationStyles).toContain('.dowager-scroll-title')
        expect(dowagerCreationStyles).toContain('.dowager-scroll-body p')
        expect(dowagerCreationStyles).toContain('font-size: 2.08cqw;')
        expect(dowagerCreationStyles).toContain('font-size: 1.28cqw;')
        expect(dowagerCreationStyles).toContain('white-space: nowrap;')
    })

    it('renders the painting review page as the dowager feedback scene', () => {
        submitPaintingForReview()
        useGameStore.setState({
            currentRound: 2,
            currentPhase: 'DOWAGER_REVIEW',
            dowagerFavor: 60,
        })
        useGameStore.getState().resolveDowagerReview()

        expect(useGameStore.getState().dowagerOfferingRecords).toHaveLength(1)
        const state = useGameStore.getState()
        const markup = renderToStaticMarkup(
            <DowagerReviewPageView
                currentRound={state.currentRound}
                dowagerFavor={state.dowagerFavor}
                pendingDowagerOffering={state.pendingDowagerOffering}
                dowagerOfferingRecords={state.dowagerOfferingRecords}
                onContinue={() => undefined}
                onOpenGuide={() => undefined}
            />,
        )

        expect(markup).toContain('太后雅好')
        expect(markup).not.toContain('玩法测试提示')
        expect(markup).toContain('好感度')
        expect(markup).toContain('90')
        expect(markup).toContain('个人安危')
        expect(markup).toContain('眷顾尚隆')
        expect(markup).toContain('dowager-offering-review-painting')
        expect(markup).toContain('dowager-review-stage-background')
        expect(markup).toContain('/images/dowager-offering/dowager-review-bg.webp')
        expect(markup).toContain('/images/dowager-offering/dowager-review-portrait.webp')
        expect(markup).toContain('/images/dowager-offering/dowager-scroll.webp')
        expect(markup).toContain('相见欢 林花谢了春红')
        expect(markup).toContain('林花谢了春红，太匆匆。')
        expect(markup).toContain('dowager-review-artwork-button')
        expect(markup).toContain('点击可放大')
        expect(markup).toContain('抒情水墨')
        expect(markup).toContain('/images/dowager-style-references/style-ink-wash.webp')
        expect(markup).toContain('太后点评')
        expect(markup).toContain('太后')
        expect(markup).toContain('退下候旨')
        expect(markup).not.toContain('画稿未及装裱')
        expect(markup).not.toContain('验收档位')
        expect(markup).not.toContain('dowager-review-board')
        expect(markup).not.toContain('dowager-work-status')
        expect(markup).not.toContain('finalScore')
        expect(markup).not.toContain('百分')
    })
})
