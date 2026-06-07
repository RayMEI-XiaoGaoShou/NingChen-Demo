import { Suspense, lazy, useEffect } from 'react'
import { PhaseErrorBoundary } from './components/ErrorBoundary/PhaseErrorBoundary'
import { PhaseCrashFallback, SettlementCrashFallback } from './components/ErrorBoundary/PhaseFallback'
import { GlobalAudio } from './components/GlobalAudio/GlobalAudio'
import { NPCDetail } from './components/NPCDetail/NPCDetail'
import { SceneTransitionLayer, SceneTransitionProvider } from './components/SceneTransition/SceneTransition'
import { INITIAL_FACTIONS } from './data/factions'
import { NORTH_INITIAL, SOUTH_INITIAL } from './data/nationStats'
import { INITIAL_RELATIONSHIP_EDGES } from './data/npcRelationships'
import { INITIAL_NPCS } from './data/npcs'
import { buildPersistedSnapshot, saveGameSnapshot } from './game/saveEngine'
import { settleRound } from './game/roundSettlement'
import type { NorthSchemeParseResult, SchemeAction, SchemeType } from './game/types'
import { useGameStore, type NpcFeedback } from './stores/gameStore'
import { useMediaStore } from './stores/mediaStore'

const Cover = lazy(() => import('./components/Cover/Cover').then(module => ({ default: module.Cover })))
const CourtView = lazy(() => import('./components/CourtView/CourtView').then(module => ({ default: module.CourtView })))
const EmpressLetter = lazy(() => import('./components/EmpressLetter/EmpressLetter').then(module => ({ default: module.EmpressLetter })))
const EmpressReply = lazy(() => import('./components/EmpressReply/EmpressReply').then(module => ({ default: module.EmpressReply })))
const Ending = lazy(() => import('./components/Ending/Ending').then(module => ({ default: module.Ending })))
const CharacterBios = lazy(() => import('./components/CharacterBios/CharacterBios').then(module => ({ default: module.CharacterBios })))
const GameplayGuide = lazy(() => import('./components/GameplayGuide/GameplayGuide').then(module => ({ default: module.GameplayGuide })))
const Prologue = lazy(() => import('./components/Prologue/Prologue').then(module => ({ default: module.Prologue })))
const RoundEnd = lazy(() => import('./components/RoundEnd/RoundEnd').then(module => ({ default: module.RoundEnd })))
const RoundStart = lazy(() => import('./components/RoundStart/RoundStart').then(module => ({ default: module.RoundStart })))
const SchemeFeedback = lazy(() => import('./components/SchemeFeedback/SchemeFeedback').then(module => ({ default: module.SchemeFeedback })))
const SchemePanel = lazy(() => import('./components/SchemePanel/SchemePanel').then(module => ({ default: module.SchemePanel })))
const Settlement = lazy(() => import('./components/Settlement/Settlement').then(module => ({ default: module.Settlement })))

export function shouldUseRoundStartFullscreenShell(
    prologueStep: string,
    currentPhase: string,
    currentRound: number,
) {
    return prologueStep === 'INGAME' && (currentPhase === 'ROUND_START' || currentPhase === 'PROLOGUE') && currentRound >= 1
}

export function shouldHideGlobalHeader(prologueStep: string, currentPhase: string) {
    const isNarrativeEntryStep =
        prologueStep === 'PROLOGUE' ||
        prologueStep === 'GAMEPLAY_GUIDE' ||
        prologueStep === 'CHARACTER_BIOS'
    const isKnownRoundPage =
        currentPhase === 'ROUND_START' ||
        currentPhase === 'COURT_OBSERVE' ||
        currentPhase === 'SCHEME_PHASE' ||
        currentPhase === 'EMPRESS_LETTER' ||
        currentPhase === 'SCHEME_FEEDBACK' ||
        currentPhase === 'EMPRESS_REPLY' ||
        currentPhase === 'SETTLEMENT' ||
        currentPhase === 'ROUND_END'

    return (
        prologueStep === 'COVER' ||
        isNarrativeEntryStep ||
        isKnownRoundPage ||
        (!isNarrativeEntryStep && currentPhase !== 'ENDING')
    )
}

export interface SchemePreviewRequest {
    targetNpcId: string
    schemeType: SchemeType
}

const SCHEME_PREVIEW_TARGETS: Record<string, string> = {
    hebaqi: 'hebaqí',
    'hebaqí': 'hebaqí',
    zongai: 'zongai',
    yuwendi: 'yuwendi',
    hebabogui: 'hebaboguì',
    'hebaboguì': 'hebaboguì',
}

export function getSchemePreviewRequest(search = typeof window !== 'undefined' ? window.location.search : ''): SchemePreviewRequest | null {
    const params = new URLSearchParams(search)
    if (params.get('preview') !== 'scheme-omen') return null

    const target = params.get('target') ?? 'hebaqi'
    return {
        targetNpcId: SCHEME_PREVIEW_TARGETS[target] ?? 'hebaqí',
        schemeType: 'omen',
    }
}

export function isSchemeFeedbackPreviewRequest(search = typeof window !== 'undefined' ? window.location.search : ''): boolean {
    return new URLSearchParams(search).get('preview') === 'scheme-feedback'
}

export function isSettlementPreviewRequest(search = typeof window !== 'undefined' ? window.location.search : ''): boolean {
    return new URLSearchParams(search).get('preview') === 'settlement'
}

const PREVIEW_NORTH_PARSE: NorthSchemeParseResult = {
    characterFit: 0.7,
    eventFit: 0.62,
    structuralPenetration: 0.38,
    executability: 0.48,
    exposureRisk: 0.16,
    financeRelevance: 0,
    grainRelevance: 0,
    militaryRelevance: 0,
    socialOrderRelevance: 0,
    governanceRelevance: 0.2,
    dominantIntent: 'neutral',
    stateBenefit: 0,
    targetBenefit: 0,
    factionBenefit: 0,
    advicePolarity: 'neutral_or_vague',
    legitimacyDirection: 0,
    omenPolarity: 'vague_or_ceremonial',
    selfTrapPotential: 0,
    scapegoatClarity: 0,
    omenAnchorStrength: 0.45,
    legitimacyCrack: 0.12,
    suspicionDirection: 0,
    suspicionTransmission: 0,
    fractureTransmission: 0,
    proxyTransmission: 0,
    evidence: ['预览用解析'],
}

function buildSchemeFeedbackPreviewActions(): SchemeAction[] {
    return [
        {
            id: 'preview-feedback-zuting',
            targetNpcId: 'zuting',
            schemeType: 'probe',
            playerSpeech: '臣只问一句，昨夜中书省灯火不灭，究竟是谁先改了奏牍？',
            northParse: PREVIEW_NORTH_PARSE,
            resolutionRoll: 0.42,
        },
        {
            id: 'preview-feedback-zongai',
            targetNpcId: 'zongai',
            relatedNpcId: 'zuting',
            schemeType: 'alienate',
            playerSpeech: '宗公若仍把宫门钥匙交给旧人，今日的安稳明日便会成罪证。',
            northParse: {
                ...PREVIEW_NORTH_PARSE,
                fractureTransmission: 0.42,
                targetBenefit: 0.12,
            },
            resolutionRoll: 0.62,
        },
        {
            id: 'preview-feedback-hebaqi',
            targetNpcId: 'hebaqí',
            schemeType: 'omen',
            playerSpeech: '赤气压星，边镇兵符恐将另有所归。',
            omenSpeechInput: {
                omenText: '赤气压星',
                interpretationText: '边镇兵符恐将另有所归',
            },
            northParse: {
                ...PREVIEW_NORTH_PARSE,
                omenAnchorStrength: 0.72,
                legitimacyCrack: 0.28,
            },
            resolutionRoll: 0.36,
        },
    ]
}

const PREVIEW_SCHEME_NAMES: Partial<Record<SchemeType, string>> = {
    probe: '试探',
    alienate: '离间',
    omen: '谶纬',
}

function buildSchemeFeedbackPreviewState() {
    const currentRound = 13
    const actions = buildSchemeFeedbackPreviewActions()
    const targetIds = new Set(actions.map(action => action.targetNpcId))
    const npcsBefore = INITIAL_NPCS.map(npc => (
        targetIds.has(npc.id)
            ? { ...npc, trust: Math.max(npc.trust, 70) }
            : { ...npc }
    ))
    const factionsBefore = INITIAL_FACTIONS.map(faction => ({ ...faction }))
    const relationshipsBefore = INITIAL_RELATIONSHIP_EDGES.map(edge => ({ ...edge }))
    const intelProgress = Object.fromEntries(
        npcsBefore.map(npc => [
            npc.id,
            targetIds.has(npc.id) ? Math.max(npc.secretThreads.length, 1) : 0,
        ]),
    )

    const settlement = settleRound({
        round: currentRound,
        difficulty: 'normal',
        schemes: actions,
        northStats: { ...NORTH_INITIAL },
        southStats: { ...SOUTH_INITIAL },
        npcs: npcsBefore,
        factions: factionsBefore,
        relationships: relationshipsBefore,
        intelProgress,
        policyOptionIndex: null,
        policyReason: '',
    })
    const npcById = new Map(npcsBefore.map(npc => [npc.id, npc] as const))
    const feedbacks: NpcFeedback[] = actions.map(action => {
        const npc = npcById.get(action.targetNpcId)
        const npcName = npc?.name ?? action.targetNpcId
        const base: NpcFeedback = {
            id: action.id ?? `${action.targetNpcId}-${action.schemeType}`,
            npcId: action.targetNpcId,
            npcName,
            schemeType: action.schemeType,
            schemeName: PREVIEW_SCHEME_NAMES[action.schemeType] ?? action.schemeType,
            playerSpeech: action.playerSpeech,
            feedback: `${npcName}读完你的话，先收住声色，只留下一句可以被旁人听见的回信。真正的态度藏在停顿里：他已经把这一步记下了。`,
            isLoading: false,
            source: '本地预览',
        }

        if (action.targetNpcId === 'zongai') {
            return {
                ...base,
                feedback: '宗爱把钥牌在掌心轻轻一叩，面上仍是笑意：宫门旧人自会换掉，但这份人情，他要你记得。',
            }
        }

        if (action.targetNpcId === 'hebaqí') {
            return {
                ...base,
                feedback: '贺拔琪没有立刻应声，只问那句赤气压星究竟从何人口中传出。边镇兵符四字，已经让他听出了第二层意思。',
                omenEcho: {
                    speakerNpcId: 'zuting',
                    speakerNpcName: '祖珽',
                    speakerTitle: '中书令',
                    text: '赤气之说一入宫门，便不只是在说天象。有人会借星变看边镇，也有人会借边镇看人心。',
                    source: 'fallback',
                },
            }
        }

        return base
    })

    return {
        actions,
        feedbacks,
        settlement,
        intelProgress,
        currentRound,
    }
}

function PhaseLoadingFallback() {
    return (
        <div className="app-phase-loading" role="status" aria-live="polite">
            <div className="app-phase-loading-panel glass-panel">
                <span className="app-phase-loading-kicker">页面载入中</span>
                <h2 className="app-phase-loading-title">正在展开这一页</h2>
                <p className="app-phase-loading-copy">朝局与回信已经在路上，稍候片刻。</p>
            </div>
        </div>
    )
}

function GuideOverlayFallback() {
    return (
        <div className="app-guide-loading" role="status" aria-live="polite">
            <span className="app-guide-loading-kicker">玩法说明</span>
            <p className="app-guide-loading-copy">正在调出冯道之替你整理好的提要。</p>
        </div>
    )
}

function App() {
    const currentPhase = useGameStore(state => state.currentPhase)
    const prologueStep = useGameStore(state => state.prologueStep)
    const currentRound = useGameStore(state => state.currentRound)
    const helpOverlayOpen = useGameStore(state => state.helpOverlayOpen)
    const { isMuted, audioReady, setMuted, requestPlayback } = useMediaStore()
    const schemePreview = getSchemePreviewRequest()
    const schemeFeedbackPreview = isSchemeFeedbackPreviewRequest()
    const settlementPreview = isSettlementPreviewRequest()
    const isPreviewRoute = Boolean(schemePreview) || schemeFeedbackPreview || settlementPreview
    const schemePreviewKey = schemePreview ? `${schemePreview.schemeType}:${schemePreview.targetNpcId}` : ''
    const schemeFeedbackPreviewKey = schemeFeedbackPreview ? 'scheme-feedback' : ''
    const settlementPreviewKey = settlementPreview ? 'settlement' : ''
    const isCoverStep = !isPreviewRoute && prologueStep === 'COVER'
    const isRoundStartFullscreenStep = !isPreviewRoute && shouldUseRoundStartFullscreenShell(prologueStep, currentPhase, currentRound)
    const isCourtStageStep = Boolean(schemePreview) || (!schemeFeedbackPreview && !settlementPreview && prologueStep === 'INGAME' && currentPhase === 'COURT_OBSERVE')
    const hideGlobalHeader = isPreviewRoute || shouldHideGlobalHeader(prologueStep, currentPhase)

    useEffect(() => {
        if (!schemePreview) return

        const state = useGameStore.getState()
        const targetNpcId = schemePreview.targetNpcId
        const intelProgress = {
            ...state.intelProgress,
            [targetNpcId]: Math.max(state.intelProgress[targetNpcId] ?? 0, 1),
        }

        useGameStore.setState({
            currentRound: 13,
            currentPhase: 'COURT_OBSERVE',
            prologueStep: 'INGAME',
            schemeCount: 0,
            currentSchemes: [],
            firstRoundGuideSeen: {
                round_start: true,
                court_observe: true,
                scheme_phase: true,
                empress_letter: true,
                scheme_feedback: true,
                settlement: true,
            },
            schemeOnboardingSeen: {
                scheme_master_guide: true,
                first_omen_teaching: true,
                first_external_line_teaching: true,
                first_follow_up_teaching: true,
            },
            omenGuideSeen: {
                ...state.omenGuideSeen,
                first_omen_modal: true,
            },
            intelProgress,
            npcs: state.npcs.map(npc =>
                npc.id === targetNpcId
                    ? { ...npc, trust: Math.max(npc.trust, 70) }
                    : npc,
            ),
        })
    }, [schemePreviewKey])

    useEffect(() => {
        if (!schemeFeedbackPreview) return

        const preview = buildSchemeFeedbackPreviewState()
        const updatedNpcs = preview.settlement.updatedNpcs
        const updatedIntelProgress = { ...preview.intelProgress }
        for (const [npcId, count] of Object.entries(preview.settlement.intelUnlocks)) {
            updatedIntelProgress[npcId] = Math.min(
                (updatedIntelProgress[npcId] ?? 0) + count,
                updatedNpcs.find(npc => npc.id === npcId)?.secretThreads.length ?? count,
            )
        }

        useGameStore.setState({
            currentRound: preview.currentRound,
            currentPhase: 'SCHEME_FEEDBACK',
            prologueStep: 'INGAME',
            schemeCount: preview.actions.length,
            currentSchemes: preview.actions,
            npcFeedbacks: preview.feedbacks,
            pendingStructuredSchemeIds: [],
            lastSettlement: preview.settlement,
            lastPolicyReport: preview.settlement.policyReport,
            lastPolicyAftereffect: preview.settlement.policyAftereffect,
            empressReplyRecord: null,
            northStats: preview.settlement.northStatsAfter,
            southStats: preview.settlement.southStatsAfter,
            northPower: preview.settlement.northPowerAfter,
            southPower: preview.settlement.southPowerAfter,
            playerDangerStage: preview.settlement.playerDangerStage,
            playerSuspicionHeat: preview.settlement.playerSuspicionHeat,
            invasionPressure: preview.settlement.invasionPressure,
            isGameOver: preview.settlement.gameResult !== 'NONE',
            gameResult: preview.settlement.gameResult,
            npcs: updatedNpcs,
            factions: preview.settlement.factionsAfter,
            relationships: preview.settlement.relationshipsAfter,
            intelProgress: updatedIntelProgress,
            pendingBacklash: preview.settlement.delayedBacklash,
            recentBacklash: [],
            roundHistory: [],
            npcMemoryLedger: {},
            relationMemoryLedger: {},
            worldMemoryLedger: [],
            endingReport: null,
            battleReport: null,
            shuCampaign: preview.settlement.shuCampaign,
            huainanCampaign: preview.settlement.huainanCampaign,
            shuMomentum: preview.settlement.shuMomentum,
            huainanMomentum: preview.settlement.huainanMomentum,
            firstRoundGuideSeen: {
                round_start: true,
                court_observe: true,
                scheme_phase: true,
                empress_letter: true,
                scheme_feedback: true,
                settlement: true,
            },
            schemeOnboardingSeen: {
                scheme_master_guide: true,
                first_omen_teaching: true,
                first_external_line_teaching: true,
                first_follow_up_teaching: true,
            },
            omenGuideSeen: {
                first_omen_modal: true,
            },
        })
    }, [schemeFeedbackPreviewKey])

    useEffect(() => {
        if (!settlementPreview) return

        const preview = buildSchemeFeedbackPreviewState()
        const updatedNpcs = preview.settlement.updatedNpcs
        const updatedIntelProgress = { ...preview.intelProgress }
        for (const [npcId, count] of Object.entries(preview.settlement.intelUnlocks)) {
            updatedIntelProgress[npcId] = Math.min(
                (updatedIntelProgress[npcId] ?? 0) + count,
                updatedNpcs.find(npc => npc.id === npcId)?.secretThreads.length ?? count,
            )
        }

        useGameStore.setState({
            currentRound: preview.currentRound,
            currentPhase: 'SETTLEMENT',
            prologueStep: 'INGAME',
            schemeCount: preview.actions.length,
            currentSchemes: preview.actions,
            npcFeedbacks: preview.feedbacks,
            pendingStructuredSchemeIds: [],
            lastSettlement: preview.settlement,
            lastPolicyReport: preview.settlement.policyReport,
            lastPolicyAftereffect: preview.settlement.policyAftereffect,
            empressReplyRecord: null,
            northStats: preview.settlement.northStatsAfter,
            southStats: preview.settlement.southStatsAfter,
            northPower: preview.settlement.northPowerAfter,
            southPower: preview.settlement.southPowerAfter,
            playerDangerStage: preview.settlement.playerDangerStage,
            playerSuspicionHeat: preview.settlement.playerSuspicionHeat,
            invasionPressure: preview.settlement.invasionPressure,
            isGameOver: preview.settlement.gameResult !== 'NONE',
            gameResult: preview.settlement.gameResult,
            npcs: updatedNpcs,
            factions: preview.settlement.factionsAfter,
            relationships: preview.settlement.relationshipsAfter,
            intelProgress: updatedIntelProgress,
            pendingBacklash: preview.settlement.delayedBacklash,
            recentBacklash: [],
            roundHistory: [],
            npcMemoryLedger: {},
            relationMemoryLedger: {},
            worldMemoryLedger: [],
            endingReport: null,
            battleReport: null,
            shuCampaign: preview.settlement.shuCampaign,
            huainanCampaign: preview.settlement.huainanCampaign,
            shuMomentum: preview.settlement.shuMomentum,
            huainanMomentum: preview.settlement.huainanMomentum,
            firstRoundGuideSeen: {
                round_start: true,
                court_observe: true,
                scheme_phase: true,
                empress_letter: true,
                scheme_feedback: true,
                settlement: true,
            },
            schemeOnboardingSeen: {
                scheme_master_guide: true,
                first_omen_teaching: true,
                first_external_line_teaching: true,
                first_follow_up_teaching: true,
            },
            omenGuideSeen: {
                first_omen_modal: true,
            },
        })
    }, [settlementPreviewKey])

    useEffect(() => {
        if (isPreviewRoute) return

        const unsubscribe = useGameStore.subscribe(state => {
            const snapshot = buildPersistedSnapshot(state)
            if (snapshot) saveGameSnapshot(snapshot)
        })
        return unsubscribe
    }, [isPreviewRoute])

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }, [currentPhase, prologueStep])

    const renderPhase = () => {
        switch (currentPhase) {
            case 'ROUND_START':
                return <RoundStart />
            case 'COURT_OBSERVE':
                return <CourtView />
            case 'SCHEME_PHASE':
                return <SchemePanel />
            case 'EMPRESS_LETTER':
                return <EmpressLetter />
            case 'SCHEME_FEEDBACK':
                return <SchemeFeedback />
            case 'EMPRESS_REPLY':
                return <EmpressReply />
            case 'SETTLEMENT':
                return <Settlement />
            case 'ROUND_END':
                return <RoundEnd />
            case 'ENDING':
                return <Ending />
            default:
                return <RoundStart />
        }
    }

    const renderContent = () => {
        if (schemeFeedbackPreview) {
            return <SchemeFeedback />
        }

        if (schemePreview) {
            return <CourtView previewScheme={schemePreview} />
        }

        if (isCoverStep) {
            return <Cover />
        }

        if (prologueStep === 'PROLOGUE') {
            return <Prologue />
        }

        if (prologueStep === 'GAMEPLAY_GUIDE') {
            return <GameplayGuide mode="entry" />
        }

        if (prologueStep === 'CHARACTER_BIOS') {
            return <CharacterBios />
        }

        return renderPhase()
    }

    const errorFallback = currentPhase === 'SETTLEMENT'
        ? <SettlementCrashFallback />
        : <PhaseCrashFallback phaseName={currentPhase} />

    return (
        <SceneTransitionProvider>
            <div className={`app${isCoverStep ? ' app-cover-shell' : ''}${isRoundStartFullscreenStep ? ' app-roundstart-shell' : ''}${isCourtStageStep ? ' app-court-shell' : ''}`}>
                {!hideGlobalHeader && (
                    <header className="app-header">
                        <span className="app-header-spacer" />
                        <span className="app-logo">佞臣</span>
                        <button
                            className="btn-audio"
                            onClick={() => {
                                if (isMuted || !audioReady) {
                                    setMuted(false)
                                    requestPlayback()
                                    return
                                }

                                setMuted(true)
                            }}
                        >
                            {isMuted ? '开声' : '静音'}
                        </button>
                    </header>
                )}
                <PhaseErrorBoundary resetKey={`${prologueStep}:${currentPhase}:${schemePreviewKey}:${schemeFeedbackPreviewKey}`} phaseName={currentPhase} fallback={errorFallback}>
                    <>
                        <main className={`app-content${isCoverStep ? ' app-content-cover' : ''}${isCourtStageStep ? ' app-content-court' : ''}`}>
                            <Suspense fallback={<PhaseLoadingFallback />}>
                                {renderContent()}
                            </Suspense>
                            {helpOverlayOpen && (
                                <div className="help-overlay">
                                    <div className="help-overlay-panel">
                                        <Suspense fallback={<GuideOverlayFallback />}>
                                            <GameplayGuide mode="overlay" />
                                        </Suspense>
                                    </div>
                                </div>
                            )}
                        </main>
                        <SceneTransitionLayer />
                        <GlobalAudio />
                        <NPCDetail />
                    </>
                </PhaseErrorBoundary>
            </div>
        </SceneTransitionProvider>
    )
}

export default App
