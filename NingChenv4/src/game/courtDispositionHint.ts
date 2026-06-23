import {
    COURT_DISPOSITION_DISMISS_THRESHOLD,
    getCourtDispositionOpportunity,
    isCourtDispositionTarget,
    isTerminalCourtDispositionNpc,
    normalizeCourtDispositionNpc,
} from './courtDisposition'
import type { NPC } from './types'

export type CourtDispositionHintTone = 'stable' | 'one_sided' | 'dismissible' | 'executable'

export interface CourtDispositionHint {
    tone: CourtDispositionHintTone
    subjectNpcId: string
    subjectNpcName: string
    shortText: string
    promptText: string
}

export function buildCourtDispositionHint(npc: NPC): CourtDispositionHint | null {
    if (!isCourtDispositionTarget(npc.id) || isTerminalCourtDispositionNpc(npc)) return null

    const courtNpc = normalizeCourtDispositionNpc(npc)
    const opportunity = getCourtDispositionOpportunity(courtNpc)
    const emperorFavor = courtNpc.emperorFavor
    const dowagerFavor = courtNpc.empressDowagerFavor
    const emperorLoose = emperorFavor <= COURT_DISPOSITION_DISMISS_THRESHOLD
    const dowagerLoose = dowagerFavor <= COURT_DISPOSITION_DISMISS_THRESHOLD

    if (opportunity === 'executable') {
        return {
            tone: 'executable',
            subjectNpcId: npc.id,
            subjectNpcName: npc.name,
            shortText: `${npc.name}两边庇护都已近绝，可借实权人物谋处决。`,
            promptText: `${npc.name}皇帝恩宠、太后眷顾皆已跌入绝境；若要收网，须借贺拔琪或宗艾这类能上达帘前、御前的人出手，可谋处决。`,
        }
    }

    if (opportunity === 'dismissible') {
        return {
            tone: 'dismissible',
            subjectNpcId: npc.id,
            subjectNpcName: npc.name,
            shortText: `${npc.name}两边根基都已松动，可谋罢黜。`,
            promptText: `${npc.name}皇帝恩宠、太后眷顾都已明显松动；此时不必急着求死局，先借贺拔琪或宗艾推动罢黜更稳。`,
        }
    }

    if (emperorLoose && !dowagerLoose) {
        return {
            tone: 'one_sided',
            subjectNpcId: npc.id,
            subjectNpcName: npc.name,
            shortText: `${npc.name}御前恩宠已薄，帘前眷顾尚未断，下一步宜转打太后。`,
            promptText: `${npc.name}御前恩宠已薄，但帘前眷顾尚未断；若要走处置链，下一手应优先让太后也对他生疑。`,
        }
    }

    if (!emperorLoose && dowagerLoose) {
        return {
            tone: 'one_sided',
            subjectNpcId: npc.id,
            subjectNpcName: npc.name,
            shortText: `${npc.name}帘前眷顾已薄，御前恩宠尚未断，下一步宜转打皇帝。`,
            promptText: `${npc.name}帘前眷顾已薄，但御前恩宠尚未断；若要走处置链，下一手应优先让皇帝也对他生疑。`,
        }
    }

    const hasEarlyCrack =
        emperorFavor <= COURT_DISPOSITION_DISMISS_THRESHOLD + 15 ||
        dowagerFavor <= COURT_DISPOSITION_DISMISS_THRESHOLD + 15

    if (hasEarlyCrack) {
        return {
            tone: 'stable',
            subjectNpcId: npc.id,
            subjectNpcName: npc.name,
            shortText: `${npc.name}已有裂口，但尚未到能收网的地步。`,
            promptText: `${npc.name}已有一处裂口，但皇帝恩宠与太后眷顾尚未同时松动；眼下宜先压低庇护，再谈罢黜或处决。`,
        }
    }

    return {
        tone: 'stable',
        subjectNpcId: npc.id,
        subjectNpcName: npc.name,
        shortText: `${npc.name}两边根基尚稳，暂不宜急着收网。`,
        promptText: `${npc.name}皇帝恩宠与太后眷顾仍未真正松动；此时强行借刀，容易落空，宜先以谗言、离间、嫁祸或谶纬削薄两边庇护。`,
    }
}

export function getCourtDispositionHintSubject(targetNpc: NPC, relatedNpc?: NPC | null): NPC {
    return relatedNpc && isCourtDispositionTarget(relatedNpc.id) ? relatedNpc : targetNpc
}

export function shouldUseCourtDispositionHint(schemeType: string): boolean {
    return ['slander', 'alienate', 'frame', 'proxy', 'omen'].includes(schemeType)
}
