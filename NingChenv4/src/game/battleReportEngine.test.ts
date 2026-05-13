import { describe, expect, it } from 'vitest'
import { buildBattleReport } from './battleReportEngine'

describe('buildBattleReport', () => {
    it('extracts pivot moments and danger rounds from round history', () => {
        const report = buildBattleReport([
            {
                round: 6,
                eventName: '益州叛变，蜀中摇动',
                schemeCount: 3,
                schemeSuccessCount: 2,
                keyTargets: ['贺拔伯圭', '祖廷'],
                policyTopic: '蜀中布局',
                policyOption: '暗中联络公孙',
                externalActionCount: 1,
                relationshipBreakCount: 1,
                factionCollapseCount: 0,
                invasionTriggered: false,
                northPower: 63.2,
                southPower: 56.4,
                summary: '外部人物明牌与西线关系链一并失衡。',
            },
            {
                round: 16,
                eventName: '征淮南战役',
                schemeCount: 3,
                schemeSuccessCount: 1,
                keyTargets: ['宇文棣'],
                policyTopic: '淮南战役方略',
                policyOption: '水陆夹击',
                externalActionCount: 0,
                relationshipBreakCount: 0,
                factionCollapseCount: 1,
                invasionTriggered: true,
                northPower: 55.1,
                southPower: 67.9,
                summary: '南征窗口彻底打开，帝党同时现出崩口。',
            },
        ])

        expect(report.pivotMoments.join('；')).toContain('第 16 回合')
        expect(report.schemeSummary.join('；')).toMatch(/宇文棣|贺拔伯圭|祖廷/)
        expect(report.policySummary.join('；')).toContain('淮南战役方略')
        expect(report.dangerMoments.join('；')).toContain('提前南征')
    })
})
