import { getDifficultyProfile } from './difficulty'
import { isExternalTerminalStatus } from './externalStatus'
import type { GameDifficulty, HighActionBias, NPC, SchemeType } from './types'

type ExternalLineNpc = Pick<
    NPC,
    'id' | 'name' | 'powerBase' | 'isAlive' | 'trust' | 'loyaltyToCourt' | 'externalStatus' | 'highActionBias'
>

export type ExternalLinePhase = '养信' | '探暗线' | '离心' | '等窗口'
export type ExternalNextMove = SchemeType | 'wait'

export interface ExternalLineProgress {
    npcId: string
    npcName: string
    ambition: HighActionBias
    phase: ExternalLinePhase
    phaseLabel: string
    summary: string
    gapText: string
    nextMove: ExternalNextMove
    nextMoveLabel: string
    trustGap: number
    loyaltyGap: number
    secretsGap: number
    windowOpen: boolean
    targetLabel: '割据' | '造反'
    nearTrack: boolean
}

function getTargetLabel(ambition: HighActionBias): '割据' | '造反' {
    return ambition === 'rebellion' ? '造反' : '割据'
}

function getThresholds(ambition: HighActionBias, difficulty: GameDifficulty) {
    const profile = getDifficultyProfile(difficulty)
    if (ambition === 'rebellion') {
        return {
            trust: 85 + profile.externalThresholdOffset.trust,
            loyalty: 18 + profile.externalThresholdOffset.loyalty,
            secrets: 2,
        }
    }

    return {
        trust: 72 + profile.externalThresholdOffset.trust,
        loyalty: 35 + profile.externalThresholdOffset.loyalty,
        secrets: 2,
    }
}

function getNextMoveLabel(move: ExternalNextMove): string {
    switch (move) {
        case 'probe':
            return '先试探'
        case 'advise':
            return '先献策'
        case 'alienate':
            return '先离间'
        case 'slander':
            return '先谗言'
        case 'wait':
            return '静待窗口'
        default:
            return '继续布局'
    }
}

export function buildExternalLineProgress(input: {
    npc: ExternalLineNpc
    unlockedSecrets: number
    difficulty: GameDifficulty
    round: number
    externalActionEnabled: boolean
}): ExternalLineProgress | null {
    const { npc, unlockedSecrets, difficulty, externalActionEnabled } = input
    if (!npc.isAlive || npc.powerBase !== 'external' || !npc.highActionBias) return null
    if (isExternalTerminalStatus(npc.externalStatus)) return null

    const ambition = npc.highActionBias
    const thresholds = getThresholds(ambition, difficulty)
    const trustGap = Math.max(0, thresholds.trust - npc.trust)
    const loyaltyGap = Math.max(0, npc.loyaltyToCourt - thresholds.loyalty)
    const secretsGap = Math.max(0, thresholds.secrets - unlockedSecrets)
    const targetLabel = getTargetLabel(ambition)
    const nearTrack =
        unlockedSecrets > 0 ||
        trustGap <= 10 ||
        loyaltyGap <= 10

    if (trustGap > 0) {
        const nextMove: ExternalNextMove = unlockedSecrets === 0 ? 'probe' : 'advise'
        return {
            npcId: npc.id,
            npcName: npc.name,
            ambition,
            phase: '养信',
            phaseLabel: `养信：先让${npc.name}认定你真会替他留后路`,
            summary: `${npc.name}眼下还不会为你摊牌，先把信任推到足以谈${targetLabel}的火候。`,
            gapText: `还差 ${trustGap} 点信任，才能煽动${targetLabel}；暗线已明 ${unlockedSecrets}/${thresholds.secrets}。`,
            nextMove,
            nextMoveLabel: getNextMoveLabel(nextMove),
            trustGap,
            loyaltyGap,
            secretsGap,
            windowOpen: externalActionEnabled,
            targetLabel,
            nearTrack,
        }
    }

    if (secretsGap > 0) {
        return {
            npcId: npc.id,
            npcName: npc.name,
            ambition,
            phase: '探暗线',
            phaseLabel: `探暗线：摸透${npc.name}真正不肯明说的底牌`,
            summary: `${npc.name}已经肯听你，但你还没摸透他最深的算盘，现在摊牌太早。`,
            gapText: `还差 ${secretsGap} 条暗线，才能煽动${targetLabel}；当前已明 ${unlockedSecrets}/${thresholds.secrets}。`,
            nextMove: 'probe',
            nextMoveLabel: getNextMoveLabel('probe'),
            trustGap,
            loyaltyGap,
            secretsGap,
            windowOpen: externalActionEnabled,
            targetLabel,
            nearTrack: true,
        }
    }

    if (loyaltyGap > 0) {
        const nextMove: ExternalNextMove = loyaltyGap > 8 ? 'alienate' : 'slander'
        return {
            npcId: npc.id,
            npcName: npc.name,
            ambition,
            phase: '离心',
            phaseLabel: `离心：把${npc.name}从北周秩序里一点点撬出来`,
            summary: `${npc.name}已可信、底牌也已摸清，但他对朝廷还没恨到敢走${targetLabel}。`,
            gapText: `忠诚还高出 ${loyaltyGap} 点，需继续压低到可试${targetLabel}的线下。`,
            nextMove,
            nextMoveLabel: getNextMoveLabel(nextMove),
            trustGap,
            loyaltyGap,
            secretsGap,
            windowOpen: externalActionEnabled,
            targetLabel,
            nearTrack: true,
        }
    }

    if (!externalActionEnabled) {
        return {
            npcId: npc.id,
            npcName: npc.name,
            ambition,
            phase: '等窗口',
            phaseLabel: `等窗口：${npc.name}已近可用，只欠一场乱局或一纸时机`,
            summary: `${npc.name}已具备走向${targetLabel}的条件，现在更像是在等一个能摊牌的回合。`,
            gapText: `信任、暗线与离心都已到位，只差外部线窗口回合，才能正式煽动${targetLabel}。`,
            nextMove: 'wait',
            nextMoveLabel: getNextMoveLabel('wait'),
            trustGap,
            loyaltyGap,
            secretsGap,
            windowOpen: false,
            targetLabel,
            nearTrack: true,
        }
    }

    return {
        npcId: npc.id,
        npcName: npc.name,
        ambition,
        phase: '等窗口',
        phaseLabel: `等窗口：${npc.name}已经能被你推向${targetLabel}`,
        summary: `${npc.name}现在就是一枚可动的外部筹码，若这一回合局势适合，就能逼他明牌。`,
        gapText: `条件已齐：信任已够、暗线已明、离心已成，当前正可试${targetLabel}。`,
        nextMove: ambition === 'rebellion' ? 'rebellion' : 'secession',
        nextMoveLabel: ambition === 'rebellion' ? '可试造反' : '可试割据',
        trustGap,
        loyaltyGap,
        secretsGap,
        windowOpen: true,
        targetLabel,
        nearTrack: true,
    }
}

export function shouldShowExternalLineTeaching(progress: ExternalLineProgress | null): boolean {
    if (!progress) return false
    return progress.phase !== '养信' || progress.nearTrack
}

export function getExternalLineStatusSummary(progress: ExternalLineProgress | null): string | null {
    if (!progress) return null
    return `${progress.phaseLabel}：${progress.gapText}`
}
