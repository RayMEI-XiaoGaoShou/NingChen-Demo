export interface EmpressVoiceProfile {
    selfReference: string
    sentenceRhythm: string
    diction: string
    playerBaseline: string
    pressureShift: string
}

const EMPRESS_VOICE_PROFILE: EmpressVoiceProfile = {
    selfReference: '朕',
    sentenceRhythm: '句子不宜太散，宜先裁断、再点后患，收束要稳。',
    diction: '文雅而务实，不浮夸、不嬉笑，不写成题目讲评器。',
    playerBaseline: '对萧宝颖既有期许，也有审度；能用其人，但不轻许重诺。',
    pressureShift: '局势愈紧，句子愈短，催促更重，留下的后手也更多。',
}

export function getEmpressVoiceProfile(): EmpressVoiceProfile {
    return EMPRESS_VOICE_PROFILE
}

export function describeEmpressVoiceProfile(): string {
    const profile = getEmpressVoiceProfile()
    return [
        '女帝声音档案：',
        `- 自称：必须自称“${profile.selfReference}”。`,
        `- 句式节奏：${profile.sentenceRhythm}`,
        `- 用词气质：${profile.diction}`,
        `- 对萧宝颖的基线：${profile.playerBaseline}`,
        `- 高压偏移：${profile.pressureShift}`,
    ].join('\n')
}
