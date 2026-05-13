import { ROUND_EVENTS } from '../data/rounds'
import { ROUND_START_RICH_BRIEFINGS } from '../data/roundStartRichBriefings'
import { getCampaignMapAsset } from './mapAssetEngine'
import type { CampaignOutcomeState, CampaignState } from './types'

const ROUND_11_CAMPAIGN_BRIEFINGS: Partial<Record<CampaignOutcomeState, string>> = {
    gained: [
        '北周建文十年·仲春。巴蜀急报入京，蜀中门户已为南陈所撼。山川天险不再只是屏障，而成北周西南腹地被割裂的明证。朝中震动，争论已不止于“如何救蜀”，而是谁来收拾西线残局、谁承担失地之责、谁能借战后整顿重塑西南兵权。陇右勋贵要兵权以救旧势，中枢疑惧地方坐大，帝党与后党也借败局互相问责。外敌得手，内争反而更烈。',
        '南陈天嘉六年·仲春。建康得蜀报后不敢尽作欢声。夺取险地只是第一步，如何安抚蜀中旧族、整饬粮道、以文武并用把新附之地化作国土，才是真正的考题。若能坐稳巴蜀，江南便不再只是守江之国；若治理失序，胜利也会变成拖累国力的深潭。',
    ].join('\n'),
    failed: [
        '北周建文十年·仲春。征蜀捷报未必辉煌，却足以让朝中暂松一口气。南陈前锋受挫，蜀中暂未脱出北周版图，原本因西南震动而互相猜忌的诸方，转眼又把话锋转向“乘势固蜀”。可胜势未稳，争权先行：谁来留镇、谁来整饷、谁能借守蜀之名握住西线军政，仍是朝堂真正的暗流。败敌不难，防自己人借势坐大才难。',
        '南陈天嘉六年·仲春。建康闻败，未至崩溃，却不得不承认西南之险远胜纸上推演。兵出三峡，粮道漫长，地方旧族观望不定，任何一处失衡都足以拖住全局。此时最要紧的不是强作胜语，而是收束前锋、保全粮路、重估蜀中人心与山川利害。若能从败局中留住伏线，今日之挫仍可成为来日再图的底稿。',
    ].join('\n'),
}

const ROUND_17_CAMPAIGN_BRIEFINGS: Partial<Record<CampaignOutcomeState, string>> = {
    gained: [
        '北周建文十三年·暮春。淮南急报入京，寿春一线已被南陈撕开缺口。此役动摇的不是一城一渡，而是北周维系江淮屏障的整条锁链。前线要援兵，后方要粮草，中枢却更急着寻找谁来承担失守之责。边将怪粮运不继，朝臣怪军令不明，帝党与后党更借败报互相攻讦。淮南一失，朝堂的疲态与裂痕便再也遮掩不住。',
        '南陈天嘉九年·暮春。建康闻得淮南破局，喜色之下更知险处。渡口、粮道、新附州县、降民安置，皆需立刻接上，不能让胜利只停在军报之上。若能稳住淮南，南朝便真正把北伐从江南口号推进到江北土地；若不能接管，前线所得亦可能在反扑与耗粮中转眼流失。',
    ].join('\n'),
    failed: [
        '北周建文十三年·暮春。淮南防线暂稳，南陈攻势受挫，京中却并无多少从容喜色。守住一线，不等于解开久战之困；前线仍要兵粮，后方仍被征发压迫，州县疲态也未因一封捷报便消散。朝中有人主张乘势反击，有人只求收缩固守，更有人开始计算若战事继续，谁该承担日益沉重的军需与民怨。胜而不舒，是此时北周最真实的处境。',
        '南陈天嘉九年·暮春。建康面对淮南受挫，不得不重新掂量攻势的重量。多年积蓄并非全无成效，却尚不足以一举撬开江北锁钥；军粮、民生、舟师与州县调度，都在久战中显出边界。此时若强攻，恐伤根本；若遽退，又会折损此前经营的声势。如何保住前线余势，同时让腹地不被战争拖空，成了南朝最难下的一道令。',
    ].join('\n'),
}

export function getCampaignResolvedState(campaign: CampaignState): CampaignOutcomeState {
    return campaign.resolvedState ?? campaign.state
}

export function getRoundStartCampaignDisplay(
    round: number,
    shuCampaign: CampaignState,
    huainanCampaign: CampaignState,
) {
    const shuResolvedState = getCampaignResolvedState(shuCampaign)
    const huainanResolvedState = getCampaignResolvedState(huainanCampaign)

    return {
        eventName: getRoundStartEventName(round, shuCampaign.state, huainanCampaign.state),
        briefing: getRoundStartBriefing(round, shuCampaign.state, huainanCampaign.state),
        map: getCampaignMapAsset(shuResolvedState, huainanResolvedState),
        summary: getCampaignRoundStartSummary(round, shuCampaign, huainanCampaign, shuResolvedState, huainanResolvedState),
    }
}

export function getRoundCampaignEventContext(
    round: number,
    shuCampaign: CampaignState,
    huainanCampaign: CampaignState,
) {
    const event = ROUND_EVENTS[round - 1]
    const campaignDisplay = getRoundStartCampaignDisplay(round, shuCampaign, huainanCampaign)

    return {
        eventName: campaignDisplay.eventName ?? event?.eventName ?? `第 ${round} 回合`,
        eventBriefing: campaignDisplay.briefing ?? ROUND_START_RICH_BRIEFINGS[round] ?? event?.briefing ?? '',
    }
}

function getRoundStartEventName(
    round: number,
    shuState: CampaignOutcomeState,
    huainanState: CampaignOutcomeState,
): string | null {
    if (round === 11) {
        if (shuState === 'gained') {
            return '蜀地已失，北周争论如何安置西线兵权'
        }

        if (shuState === 'failed') {
            return '征蜀受挫之后，北周重议西线兵权与后续布置'
        }

        if (shuState === 'stalemate') {
            return '蜀地战局僵持，北周争论战后如何安置西线兵权'
        }
    }

    if (round === 17) {
        if (huainanState === 'gained') {
            return '淮南失守，北周前线后方俱显疲态'
        }

        if (huainanState === 'failed') {
            return '淮南守线暂稳，北周前线后方仍显疲态'
        }

        if (huainanState === 'stalemate') {
            return '淮南久战，北周征发日重，前线后方俱显疲态'
        }
    }

    return null
}

function getRoundStartBriefing(
    round: number,
    shuState: CampaignOutcomeState,
    huainanState: CampaignOutcomeState,
): string | null {
    if (round === 11) {
        return ROUND_11_CAMPAIGN_BRIEFINGS[shuState] ?? null
    }

    if (round === 17) {
        return ROUND_17_CAMPAIGN_BRIEFINGS[huainanState] ?? null
    }

    return null
}

function getCampaignRoundStartSummary(
    round: number,
    shuCampaign: CampaignState,
    huainanCampaign: CampaignState,
    shuResolvedState: CampaignOutcomeState,
    huainanResolvedState: CampaignOutcomeState,
): string | null {
    if (shuCampaign.state !== 'idle') {
        return getShuRoundStartSummary(round, shuCampaign.state)
    }

    if (huainanCampaign.state !== 'idle') {
        return getHuainanRoundStartSummary(round, huainanCampaign.state)
    }

    if (huainanResolvedState === 'gained') {
        return '南陈已据淮南，北周前线与漕运至今仍受牵制。'
    }

    if (shuResolvedState === 'gained') {
        return '南陈已稳住蜀地，北周西线至今未能回到旧日节奏。'
    }

    return null
}

function getShuRoundStartSummary(round: number, state: CampaignOutcomeState): string | null {
    if (state === 'gained') {
        return round === 11
            ? '蜀地方向已现胜机，南陈已在巴蜀抢下先手；北周朝堂争的已不只是如何反攻，更是谁来替西线残局收权、收兵、收人心。'
            : '南陈已稳住蜀地，北周西线不得不转入补缀。'
    }

    if (state === 'stalemate') {
        return '巴蜀战局陷入僵持。山川险绝，粮道漫长，前线虽未见大溃，却也未能传回足以安定朝心的捷报。'
    }

    if (state === 'failed') {
        return '南陈征蜀受挫，前锋被迫收束，北周西线得以暂时喘息，朝堂随即转向追问如何乘胜稳住巴蜀。'
    }

    return null
}

function getHuainanRoundStartSummary(round: number, state: CampaignOutcomeState): string | null {
    if (state === 'gained') {
        return round === 17
            ? '淮南防线已被撕开缺口，南陈正乘势稳住渡口与粮道；北周前线后方同时失衡，谁来担责已成满朝心病。'
            : '南陈已据淮南，北周前线与漕运持续受压。'
    }

    if (state === 'stalemate') {
        return '淮南战事迁延日久，前线要兵、要粮、要甲仗，后方催征、催赋、催民夫，百姓与州县都被压得喘不过气。'
    }

    if (state === 'failed') {
        return '南陈淮南受挫，攻势被迫回收，北周得以暂稳守线，但长期征发留下的疲色并未因此消去。'
    }

    return null
}
