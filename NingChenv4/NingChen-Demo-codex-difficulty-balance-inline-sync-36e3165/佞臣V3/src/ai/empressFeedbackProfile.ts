import type { EmpressFeedbackContext } from '../game/empressFeedbackContext'

export interface EmpressFeedbackProfile {
    rulingPosture: string
    statePriority: string
    playerTone: string
    closureMove: string
    lengthAdvice: string
}

export function describeEmpressFeedbackProfile(context: EmpressFeedbackContext): EmpressFeedbackProfile {
    const rulingPosture = (() => {
        if (context.reasonQuality === 'high' && context.focusMatched && context.legitimacyTone !== 'down') {
            return '这条附言可明白采纳，但仍要点出代价与留手，不能写成全然欣然。'
        }
        if (context.reasonQuality === 'low' || !context.focusMatched) {
            return '这条附言至多可借其意，不可尽照其笔；批语应更像朕替你收束，而非全盘照录。'
        }
        if (context.legitimacyTone === 'down') {
            return '此策虽可用，却更易牵动名分与人心，批语宜审慎采用、压住锋芒。'
        }
        return '这条附言方向可用，但仍要由朕替你把节奏和轻重重新按住。'
    })()

    const statePriority = context.warWindow
        ? `眼下更该把${context.policyDomainLabel}与${context.weakestDimensionLabel}的压力一起看，不能只写雄心，不写后劲。`
        : `眼下更该先顾住${context.weakestDimensionLabel}，再谈其余铺排，别把批语写成只重气魄。`

    const playerTone = (() => {
        if (context.playerDangerStage === 'under_review') {
            return '对萧宝颖的口气宜更收束，先提醒其自保，再言国事。'
        }
        if (context.playerDangerStage === 'under_watch') {
            return '对萧宝颖的口气宜半是提醒、半是寄望，不可把话说得太满。'
        }
        return '对萧宝颖可多一分期许，但仍要保留帝王的分寸与审度。'
    })()

    const closureMove = (() => {
        if (context.warWindow) {
            return '结尾宜落在节奏、后勤、代价或时机上，不把话写绝。'
        }
        if (context.legitimacyTone === 'up') {
            return '结尾可留一句“朕已记下”式后手，让认可之中仍有帝王的收束。'
        }
        if (context.legitimacyTone === 'down') {
            return '结尾宜落在“可行而不可过”这一层戒语上。'
        }
        return '结尾宜像一道收住的裁断：先如此行之，余者容后再定。'
    })()

    return {
        rulingPosture,
        statePriority,
        playerTone,
        closureMove,
        lengthAdvice: '正常 2-3 句，必要时可到 4 句，但不宜拖成长札。',
    }
}

export function formatEmpressFeedbackProfile(profile: EmpressFeedbackProfile): string {
    return [
        '女帝回批矩阵：',
        `- 批示温度：${profile.rulingPosture}`,
        `- 国家重心：${profile.statePriority}`,
        `- 对萧宝颖的口气：${profile.playerTone}`,
        `- 结尾动作：${profile.closureMove}`,
        `- 长度建议：${profile.lengthAdvice}`,
    ].join('\n')
}
