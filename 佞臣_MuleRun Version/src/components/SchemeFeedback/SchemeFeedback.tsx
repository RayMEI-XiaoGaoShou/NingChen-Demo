import { useEffect } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { FIRST_ROUND_GUIDE_CONTENT } from '../../data/prologueContent'
import { ROUND_EVENTS } from '../../data/rounds'
import { parseNorthSchemeInput } from '../../game/aiNativeEngine'
import { buildNpcPromptDynamicContext } from '../../game/npcPromptContext'
import { buildNpcPrompt, sanitizeNpcReplyText } from '../../ai/prompts'
import { chatCompletion, getAiMode, getAiModeLabel } from '../../ai/aiService'
import { previewSchemeSuccess } from '../../game/schemeEngine'
import { FirstRoundGuideModal } from '../FirstRoundGuide/FirstRoundGuideModal'
import { NpcPortrait } from '../NpcPortrait/NpcPortrait'
import './SchemeFeedback.css'

const SCHEME_NAMES: Record<string, string> = {
    probe: '试探',
    advise: '献策',
    slander: '谗言',
    alienate: '离间',
    frame: '放风构陷',
    proxy: '借刀',
    appeal: '求援',
    omen: '谶纬',
}

const LOCAL_REPLY_FALLBACK = '似有反应，却未置可否……'

export function SchemeFeedback() {
    const {
        npcFeedbacks,
        currentSchemes,
        npcs,
        factions,
        intelProgress,
        recentBacklash,
        roundHistory,
        pendingStructuredSchemeIds,
        addNpcFeedback,
        updateNpcFeedback,
        updateSchemeParse,
        markSchemeParsePending,
        nextPhase,
        currentRound,
        firstRoundGuideSeen,
        markFirstRoundGuideSeen,
        openGameplayGuide,
    } = useGameStore()

    const allDone = npcFeedbacks.every(item => !item.isLoading)
    const allParsed = currentSchemes.every(action => Boolean(action.northParse)) && pendingStructuredSchemeIds.length === 0
    const currentRoundEvent = ROUND_EVENTS[currentRound - 1]

    useEffect(() => {
        if (npcFeedbacks.length > 0 || currentSchemes.length === 0) return

        currentSchemes.forEach((action, index) => {
            const targetNpc = npcs.find(npc => npc.id === action.targetNpcId)
            if (!targetNpc) return

            const feedbackId = action.id ?? `rebuild_${index}_${targetNpc.id}`
            const previousActions = currentSchemes
                .slice(0, index)
                .filter(item => item.targetNpcId === action.targetNpcId).length

            addNpcFeedback({
                id: feedbackId,
                npcId: targetNpc.id,
                npcName: targetNpc.name,
                schemeType: action.schemeType,
                schemeName: SCHEME_NAMES[action.schemeType] ?? action.schemeType,
                playerSpeech: action.playerSpeech,
                feedback: '',
                isLoading: true,
                source: getAiModeLabel(),
            })

            const relatedNpc = action.relatedNpcId
                ? npcs.find(npc => npc.id === action.relatedNpcId) ?? null
                : null
            const knownSecretThreads = targetNpc.secretThreads.slice(0, intelProgress[targetNpc.id] ?? 0)
            const dynamicContext = buildNpcPromptDynamicContext({
                npc: targetNpc,
                factions,
                roundHistory,
                recentBacklash,
            })

            const parsePromise = action.northParse
                ? Promise.resolve(action.northParse)
                : (
                    markSchemeParsePending(feedbackId),
                    parseNorthSchemeInput({
                        round: currentRound,
                        npc: targetNpc,
                        speech: action.playerSpeech,
                        relatedNpc,
                    }).then(parsed => {
                        updateSchemeParse(feedbackId, parsed)
                        return parsed
                    })
                )

            parsePromise
                .then(parsed => {
                    const success = previewSchemeSuccess(
                        { ...action, northParse: parsed },
                        targetNpc,
                        previousActions,
                        action.resolutionRoll ?? 0.5,
                        {
                            round: currentRound,
                            unlockedSecrets: intelProgress[targetNpc.id] ?? 0,
                            northParse: parsed,
                        },
                    )

                    return chatCompletion(
                        buildNpcPrompt({
                            npc: targetNpc,
                            schemeType: action.schemeType,
                            speech: action.playerSpeech,
                            success,
                            round: currentRound,
                            eventName: currentRoundEvent?.eventName,
                            eventBriefing: currentRoundEvent?.briefing,
                            knownSecretThreads,
                            previousDealings: dynamicContext.previousDealings,
                            relationshipTemperature: dynamicContext.relationshipTemperature,
                            recentCourtFortune: dynamicContext.recentCourtFortune,
                            factionPressure: dynamicContext.factionPressure,
                        }),
                        {
                            temperature: 0.75,
                            maxTokens: 200,
                            tag: `npc_${action.schemeType}_${success ? 'success' : 'failure'}`,
                        },
                    )
                })
                .then(reply => {
                    const source = getAiMode() === 'fallback' ? '本地兜底' : getAiModeLabel()
                    const cleanedReply = sanitizeNpcReplyText(reply.trim())
                    updateNpcFeedback(feedbackId, cleanedReply || `${targetNpc.name}${LOCAL_REPLY_FALLBACK}`, source)
                })
                .catch(() => {
                    updateNpcFeedback(feedbackId, `${targetNpc.name}${LOCAL_REPLY_FALLBACK}`, '本地兜底')
                })
        })
    }, [
        addNpcFeedback,
        currentRound,
        currentRoundEvent?.briefing,
        currentRoundEvent?.eventName,
        currentSchemes,
        factions,
        intelProgress,
        markSchemeParsePending,
        npcFeedbacks.length,
        npcs,
        recentBacklash,
        roundHistory,
        updateNpcFeedback,
        updateSchemeParse,
    ])

    useEffect(() => {
        currentSchemes.forEach(action => {
            if (!action.id || action.northParse || pendingStructuredSchemeIds.includes(action.id)) return

            const targetNpc = npcs.find(npc => npc.id === action.targetNpcId)
            if (!targetNpc) return

            const relatedNpc = action.relatedNpcId
                ? npcs.find(npc => npc.id === action.relatedNpcId) ?? null
                : null

            markSchemeParsePending(action.id)
            parseNorthSchemeInput({
                round: currentRound,
                npc: targetNpc,
                speech: action.playerSpeech,
                relatedNpc,
            }).then(parsed => {
                updateSchemeParse(action.id!, parsed)
            })
        })
    }, [currentRound, currentSchemes, markSchemeParsePending, npcs, pendingStructuredSchemeIds, updateSchemeParse])

    return (
        <div className="page-container scheme-feedback animate-fade-in">
            {currentRound === 1 && !firstRoundGuideSeen.scheme_feedback && (
                <FirstRoundGuideModal
                    title={FIRST_ROUND_GUIDE_CONTENT.scheme_feedback.title}
                    body={FIRST_ROUND_GUIDE_CONTENT.scheme_feedback.body}
                    onClose={() => markFirstRoundGuideSeen('scheme_feedback')}
                />
            )}

            <div className="page-utility-row animate-slide-up">
                <button className="btn-help" onClick={() => openGameplayGuide('gameplay')}>
                    玩法说明
                </button>
            </div>

            <div className="scheme-feedback-header animate-slide-up">
                <span className="page-eyebrow">暗线揭卷</span>
                <h2 className="page-title">暗线回报</h2>
            </div>

            <div className="page-mission-strip animate-slide-up animate-delay-1">
                <div className="page-mission-item">
                    <span className="page-mission-label">先看什么</span>
                    <p className="page-mission-text">先看谁回得最快、谁口气最硬，这比单看成败更能说明人心。</p>
                </div>
                <div className="page-mission-item">
                    <span className="page-mission-label">怎么看</span>
                    <p className="page-mission-text">把每封回报当成揭卷，不只看他说了什么，更看他回避了什么。</p>
                </div>
                <div className="page-mission-item">
                    <span className="page-mission-label">下一步做什么</span>
                    <p className="page-mission-text">等结构化解析完成后，再进结算页看这些波纹如何传到了朝局与国势上。</p>
                </div>
            </div>

            <div className="feedback-list">
                {npcFeedbacks.length === 0 && (
                    <div className="feedback-item glass-panel decree-panel done">
                        <div className="feedback-body">
                            <div className="feedback-text-area">
                                <p className="feedback-text">本回合暂未收到暗线回报。若再次出现，请记录回合与目标，我会继续追查。</p>
                            </div>
                        </div>
                    </div>
                )}

                {npcFeedbacks.map((fb, index) => (
                    <div
                        key={fb.id}
                        className={`feedback-item glass-panel decree-panel animate-slide-up ${fb.isLoading ? 'loading' : 'done'}`}
                        style={{ animationDelay: `${0.1 + index * 0.15}s` }}
                    >
                        <div className="feedback-header">
                            <NpcPortrait name={fb.npcName} className="feedback-avatar" />
                            <div className="feedback-meta">
                                <span className="feedback-order">第 {index + 1} 封回报</span>
                                <span className="feedback-npc-name">{fb.npcName}</span>
                                <span className="feedback-scheme-label">
                                    计谋：{fb.schemeName}
                                    {fb.playerSpeech && <span className="feedback-speech"> · “{fb.playerSpeech}”</span>}
                                </span>
                            </div>
                            <span className={`feedback-status ${fb.isLoading ? 'loading' : 'done'}`}>
                                {fb.isLoading ? '未揭卷' : '已揭卷'}
                            </span>
                        </div>

                        <div className="feedback-body">
                            {fb.isLoading ? (
                                <div className="loading-state">
                                    <div className="ai-ripple" />
                                    <p className="loading-hint">{fb.npcName}正在思忖……</p>
                                </div>
                            ) : (
                                <div className="feedback-text-area animate-fade-in">
                                    <div className="quote-mark">“</div>
                                    <p className="feedback-text">{sanitizeNpcReplyText(fb.feedback)}</p>
                                    <div className="quote-mark end">”</div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="action-footer animate-slide-up animate-delay-4">
                <button
                    className="btn-primary btn-proceed"
                    onClick={nextPhase}
                    disabled={!allDone || !allParsed}
                >
                    {allDone ? (allParsed ? '查看结算' : '等待结构化解析…') : '等待暗线回报…'}
                </button>
            </div>
        </div>
    )
}
