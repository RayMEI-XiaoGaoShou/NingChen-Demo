# Omen Presentation And Parse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make 谶纬 a high-success, low-frequency特色玩法 with clearer AI parsing, immersive two-layer feedback, and an explainable external-warlord suspicion-to-sanction chain.

**Architecture:** Keep DeepSeek responsible for parsing and prose while local deterministic rules own success rates and numeric effects. Extend existing parse, settlement, feedback, and round-rule modules without replacing their orchestration. Add small focused helpers for omen echo speaker selection and fallback prose so `SchemeFeedback.tsx` does not become more tangled.

**Tech Stack:** React, TypeScript, Vite, Zustand, Vitest, DeepSeek-compatible chat completion wrappers.

---

## File Structure

- Modify `src/game/types.ts`: add two omen parse fields and an `OmenEchoFeedback` interface.
- Modify `src/game/aiNativeEngine.ts`: normalize new fields, add fallback scoring, merge fallback omen fields when AI omits them.
- Modify `src/ai/prompts.ts`: extend parse prompt, add omen-specific NPC response guidance, add `buildOmenEchoPrompt`.
- Modify `src/data/roundRuleConfig.ts`: add `allowExternalOmen`, open omen on 3/8/15, include 13-round 祖廷, and allow non-terminal external NPCs on configured rounds.
- Modify `src/game/schemeEngine.ts`: add omen-specific success calculation and external omen person effects.
- Modify `src/game/roundSettlement.ts`: apply `militaryPowerDelta` to external NPCs and preserve existing loyalty/trust behavior.
- Create `src/game/omenEcho.ts`: select the court speaker, build fallback echo text, and package echo metadata.
- Modify `src/stores/gameStore.ts`: store `omenEcho` on `NpcFeedback`, add an update action.
- Modify `src/components/SchemeFeedback/SchemeFeedback.tsx`: generate and render omen echo for omen feedback cards.
- Modify `src/components/SchemeFeedback/SchemeFeedback.css`: style the omen echo block.
- Modify tests in `src/game`, `src/ai`, `src/data`, `src/stores`, and `src/components/SchemeFeedback`.

---

### Task 1: Extend Omen Parse And Feedback Types

**Files:**
- Modify: `src/game/types.ts`
- Test: `src/game/aiNativeEngine.test.ts`

- [ ] **Step 1: Add failing normalization test for new omen fields**

Append this test to `src/game/aiNativeEngine.test.ts` in the existing fallback/normalization describe block:

```ts
it('normalizes omen accusation and sanction leverage fields', () => {
    const parsed = normalizeNorthSchemeParse({
        characterFit: 0.1,
        eventFit: 0.2,
        structuralPenetration: 0.3,
        executability: 0.4,
        exposureRisk: 0.5,
        financeRelevance: 0.1,
        grainRelevance: 0.2,
        militaryRelevance: 0.3,
        socialOrderRelevance: 0.4,
        governanceRelevance: 0.5,
        dominantIntent: 'divide',
        omenAccusationClarity: 1.4,
        centralSanctionLeverage: -0.2,
        evidence: ['外镇被谶辞指向'],
    })

    expect(parsed.omenAccusationClarity).toBe(1)
    expect(parsed.centralSanctionLeverage).toBe(0)
})
```

Expected failure: TypeScript reports `omenAccusationClarity` and `centralSanctionLeverage` do not exist on `NorthSchemeParseResult`.

- [ ] **Step 2: Run the targeted test to verify failure**

Run:

```bash
npm test -- src/game/aiNativeEngine.test.ts
```

Expected: FAIL due missing type fields or missing imported `normalizeNorthSchemeParse` if the test file does not currently import it.

- [ ] **Step 3: Add type fields and echo interface**

In `src/game/types.ts`, extend `NorthSchemeParseResult`:

```ts
    omenAccusationClarity?: number
    centralSanctionLeverage?: number
```

Add this exported interface near `OmenSpeechInput`:

```ts
export interface OmenEchoFeedback {
    speakerNpcId: string
    speakerNpcName: string
    speakerTitle: string
    text: string
    source: string
}
```

If `src/game/aiNativeEngine.test.ts` does not import `normalizeNorthSchemeParse`, update its import:

```ts
import {
    fallbackNorthParseFromSpeech,
    normalizeNorthSchemeParse,
} from './aiNativeEngine'
```

- [ ] **Step 4: Normalize the new fields**

In `src/game/aiNativeEngine.ts`, add these lines inside `normalizeNorthSchemeParse`:

```ts
        omenAccusationClarity: clamp01(candidate.omenAccusationClarity),
        centralSanctionLeverage: clamp01(candidate.centralSanctionLeverage),
```

- [ ] **Step 5: Run targeted test**

Run:

```bash
npm test -- src/game/aiNativeEngine.test.ts
```

Expected: PASS for the new normalization test.

- [ ] **Step 6: Commit**

```bash
git add src/game/types.ts src/game/aiNativeEngine.ts src/game/aiNativeEngine.test.ts
git commit -m "feat: add omen parse fields"
```

---

### Task 2: Update AI Parse Prompt And Fallback Scoring

**Files:**
- Modify: `src/ai/prompts.ts`
- Modify: `src/game/aiNativeEngine.ts`
- Test: `src/ai/prompts.test.ts`
- Test: `src/game/aiNativeEngine.test.ts`

- [ ] **Step 1: Add failing prompt tests**

Append to `src/ai/prompts.test.ts`:

```ts
it('asks DeepSeek to score external omen accusation and sanction leverage', () => {
    const npc = { ...INITIAL_NPCS.find(item => item.id === 'hebaboguì')! }
    const messages = buildNorthSchemeParsePrompt({
        round: 15,
        npc,
        schemeType: 'omen',
        speech: '白鱼入营，鳞有反文，此乃外镇拥兵自重之兆；请朝廷缓发军资，先查账册。',
        omenSpeechInput: {
            omenText: '白鱼入营，鳞有反文',
            interpretationText: '外镇拥兵自重，请朝廷缓发军资，先查账册',
        },
        eventName: '河北豪强兼并、流民滋生，地方控制力下降',
        eventBriefing: '地方不是突然失控，而是在所有人争大局时，一寸一寸滑出朝廷掌心。',
    })
    const prompt = messages.map(item => item.content).join('\n')

    expect(prompt).toContain('目标类型')
    expect(prompt).toContain('地方军头')
    expect(prompt).toContain('"omenAccusationClarity"')
    expect(prompt).toContain('"centralSanctionLeverage"')
    expect(prompt).toContain('削粮饷')
})
```

Expected failure: prompt does not contain new field names or external context.

- [ ] **Step 2: Add failing fallback test**

Append to `src/game/aiNativeEngine.test.ts`:

```ts
it('fallback scores external omen accusation and central sanction leverage', () => {
    const npc = INITIAL_NPCS.find(item => item.id === 'hebaboguì')!
    const parsed = fallbackNorthParseFromSpeech({
        round: 15,
        npc,
        schemeType: 'omen',
        speech: '白鱼入营，鳞有反文，此乃外镇拥兵自重之兆；请朝廷缓发军资，先查账册，勿使其甲胄兵器坐大。',
        omenSpeechInput: {
            omenText: '白鱼入营，鳞有反文',
            interpretationText: '外镇拥兵自重，请朝廷缓发军资，先查账册，勿使其甲胄兵器坐大',
        },
        eventName: '河北豪强兼并、流民滋生，地方控制力下降',
        eventBriefing: '地方不是突然失控，而是在所有人争大局时，一寸一寸滑出朝廷掌心。',
    })

    expect(parsed.omenAccusationClarity ?? 0).toBeGreaterThanOrEqual(0.45)
    expect(parsed.centralSanctionLeverage ?? 0).toBeGreaterThanOrEqual(0.45)
    expect(parsed.grainRelevance).toBeGreaterThan(0)
    expect(parsed.militaryRelevance).toBeGreaterThan(0)
})
```

Expected failure: new fields remain 0.

- [ ] **Step 3: Extend parse prompt**

In `src/ai/prompts.ts`, add target context inside `buildNorthSchemeParsePrompt` before `speechBlock`:

```ts
    const targetTypeLine = params.npc.powerBase === 'external'
        ? `目标类型：地方军头 / 外部势力
地方军头数值：军力 ${params.npc.militaryPower}，忠诚度 ${params.npc.loyaltyToCourt}，信任度 ${params.npc.trust}，倾向 ${params.npc.alignmentBias}，当前状态 ${params.npc.externalStatus}`
        : '目标类型：朝堂角色'
```

Insert `${targetTypeLine}` into the prompt after target character lines.

Extend the omen-specific rubric:

```ts
                  '\n- 若目标是地方军头，重点判断谶纬是否会让中枢怀疑其有异心，并是否足以引出削粮饷、缓发兵器甲胄、派监军、查军需账册等动作。' +
                  '\n- 地方军头谶纬不是直接说服军头，而是制造中枢猜疑；只有出现明确指控与可执行制裁抓手，才可给高 centralSanctionLeverage。'
```

Extend `polarityRubric`:

```ts
        '\n- omenAccusationClarity 只在 omen 里重点判断：征兆是否明确指向某人、某地方军头、某派系或某权力集团的异心，范围 0 到 1。' +
        '\n- centralSanctionLeverage 只在 omen 里重点判断：这段谶纬是否足以让中枢采取削粮饷、缓发兵器甲胄、派监军、查账册、收兵符等动作，范围 0 到 1。'
```

Add JSON fields:

```json
  "omenAccusationClarity": 0-1,
  "centralSanctionLeverage": 0-1,
```

- [ ] **Step 4: Add fallback keyword scoring**

In `src/game/aiNativeEngine.ts`, add constants near existing word lists:

```ts
const NORTH_OMEN_ACCUSATION_WORDS = ['外镇', '边镇', '节度', '军头', '拥兵', '坐大', '异心', '叛心', '不臣', '割据']
const NORTH_OMEN_SANCTION_WORDS = ['削饷', '停饷', '缓发粮草', '军资', '兵器', '甲胄', '监军', '查账', '清查军需', '收兵符']
```

Update `deriveOmenSpecialization` return type:

```ts
    omenAccusationClarity: number
    centralSanctionLeverage: number
```

Inside `deriveOmenSpecialization`, add:

```ts
    const omenAccusationClarity = clamp01(
        0.04
        + scoreMatches(interpretationSource, NORTH_OMEN_ACCUSATION_WORDS) * 0.9
        + scoreMatches(anchorSource, ['反文', '白鱼', '黑气', '赤光', '龙蛇', '兵灾']) * 0.24
        + (includesAny(interpretationSource, ['疑其', '指向', '暗指', '应验在']) ? 0.16 : 0),
    )

    const centralSanctionLeverage = clamp01(
        0.04
        + scoreMatches(interpretationSource, NORTH_OMEN_SANCTION_WORDS) * 0.92
        + scoreMatches(interpretationSource, ['粮饷', '粮草', '军需', '军器', '补员', '互市']) * 0.34
        + (includesAny(interpretationSource, ['朝廷当', '中枢当', '宜先', '请朝廷']) ? 0.12 : 0),
    )
```

Return them and add them to the fallback object for non-omen as 0.

- [ ] **Step 5: Write normalized fallback fields**

In the `return normalizeNorthSchemeParse({ ... })` object, add:

```ts
        omenAccusationClarity: omenSpecialization.omenAccusationClarity,
        centralSanctionLeverage: omenSpecialization.centralSanctionLeverage,
```

- [ ] **Step 6: Add AI/fallback omen-field merge**

In `parseNorthSchemeInput`, after `const normalized = normalizeNorthSchemeParse(aiParsed)`, add helper logic:

```ts
        const aiOmenSignal = Math.max(
            normalized.omenAnchorStrength ?? 0,
            normalized.legitimacyCrack ?? 0,
            normalized.suspicionDirection ?? 0,
            normalized.omenAccusationClarity ?? 0,
            normalized.centralSanctionLeverage ?? 0,
        )
        const fallbackOmenSignal = Math.max(
            fallbackParsed.omenAnchorStrength ?? 0,
            fallbackParsed.legitimacyCrack ?? 0,
            fallbackParsed.suspicionDirection ?? 0,
            fallbackParsed.omenAccusationClarity ?? 0,
            fallbackParsed.centralSanctionLeverage ?? 0,
        )
        const mergedOmenFields = params.schemeType === 'omen' && aiOmenSignal < 0.08 && fallbackOmenSignal >= 0.18
            ? {
                omenAnchorStrength: fallbackParsed.omenAnchorStrength,
                legitimacyCrack: fallbackParsed.legitimacyCrack,
                suspicionDirection: fallbackParsed.suspicionDirection,
                omenAccusationClarity: fallbackParsed.omenAccusationClarity,
                centralSanctionLeverage: fallbackParsed.centralSanctionLeverage,
                omenPolarity: fallbackParsed.omenPolarity,
                legitimacyDirection: fallbackParsed.legitimacyDirection,
            }
            : {}
```

Return `{ ...normalized, ...mergedOmenFields }` in both the dimension fallback and normal return branches.

- [ ] **Step 7: Run targeted tests**

Run:

```bash
npm test -- src/ai/prompts.test.ts src/game/aiNativeEngine.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/ai/prompts.ts src/ai/prompts.test.ts src/game/aiNativeEngine.ts src/game/aiNativeEngine.test.ts
git commit -m "feat: extend omen parsing rubric"
```

---

### Task 3: Reconfigure Omen Availability

**Files:**
- Modify: `src/data/roundRuleConfig.ts`
- Test: `src/data/roundRuleConfig.test.ts`

- [ ] **Step 1: Add failing availability tests**

Replace the existing omen availability test in `src/data/roundRuleConfig.test.ts` with:

```ts
it('opens 谶纬 on configured omen rounds for court and external targets', () => {
    const zuting = INITIAL_NPCS.find(npc => npc.id === 'zuting')!
    const zongai = INITIAL_NPCS.find(npc => npc.id === 'zongai')!
    const hebabogui = INITIAL_NPCS.find(npc => npc.id === 'hebaboguì')!
    const dugu = INITIAL_NPCS.find(npc => npc.id === 'duguwenyue')!

    expect(isOmenAvailableForNpc(3, zongai)).toBe(true)
    expect(isOmenAvailableForNpc(8, zuting)).toBe(true)
    expect(isOmenAvailableForNpc(13, zuting)).toBe(true)
    expect(isOmenAvailableForNpc(15, hebabogui)).toBe(true)
    expect(isOmenAvailableForNpc(14, hebabogui)).toBe(false)
    expect(isOmenAvailableForNpc(9, zongai)).toBe(false)

    expect(isOmenAvailableForNpc(15, { ...dugu, externalStatus: 'secession' })).toBe(false)
    expect(isOmenAvailableForNpc(15, { ...dugu, isAlive: false })).toBe(false)
})
```

Expected failure: round 3/8/15 and external targets are not open.

- [ ] **Step 2: Extend round rule shape**

In `src/data/roundRuleConfig.ts`, extend `RoundRuleContext`:

```ts
    allowExternalOmen: boolean
```

Set `allowExternalOmen: false` in `DEFAULT_RULE`.

- [ ] **Step 3: Update round configurations**

Set configured rounds:

```ts
3: { round: 3, invasionWindowLabel: '安内压制', emperorPressure: 0, empressPressure: 5, omenNpcIds: ['zongai', 'hebaqí', 'yuwendi', 'zuting'], allowExternalOmen: false, tags: ['disaster', 'omen'], militarySpilloverStrength: 0 },
8: { round: 8, invasionWindowLabel: '安内压制', emperorPressure: 0, empressPressure: 4, omenNpcIds: ['zongai', 'hebaqí', 'yuwendi', 'zuting'], allowExternalOmen: false, tags: ['disaster', 'omen'], militarySpilloverStrength: 0 },
13: { round: 13, invasionWindowLabel: '安内压制', emperorPressure: 0, empressPressure: 4, omenNpcIds: ['zongai', 'hebaqí', 'yuwendi', 'zuting'], allowExternalOmen: false, tags: ['disaster', 'omen'], militarySpilloverStrength: 0 },
14: { round: 14, invasionWindowLabel: '均衡摇摆', emperorPressure: 3, empressPressure: 3, omenNpcIds: ['zongai', 'hebaqí', 'yuwendi', 'zuting'], allowExternalOmen: false, tags: ['omen', 'courtSplit'], militarySpilloverStrength: 0 },
15: { round: 15, invasionWindowLabel: '安内压制', emperorPressure: 1, empressPressure: 4, omenNpcIds: ['zongai', 'hebaqí', 'yuwendi', 'zuting'], allowExternalOmen: true, tags: ['disaster', 'localLoss', 'omen'], militarySpilloverStrength: 0 },
19: { round: 19, invasionWindowLabel: '安内压制', emperorPressure: 2, empressPressure: 4, omenNpcIds: ['zongai', 'hebaqí', 'yuwendi', 'zuting'], allowExternalOmen: true, tags: ['disaster', 'purge', 'courtSplit', 'omen'], militarySpilloverStrength: 1 },
20: { round: 20, invasionWindowLabel: '终局摊牌', emperorPressure: 5, empressPressure: 3, omenNpcIds: ['zongai', 'hebaqí', 'yuwendi'], allowExternalOmen: true, tags: ['war', 'courtSplit', 'omen', 'purge'], militarySpilloverStrength: 2 },
```

For all other rounds, add `allowExternalOmen: false`.

- [ ] **Step 4: Allow external target checks**

Change `isOmenAvailableForNpc` signature:

```ts
export function isOmenAvailableForNpc(
    round: number,
    npc: Pick<NPC, 'id' | 'powerBase' | 'externalStatus' | 'isAlive'>,
): boolean {
    const rule = getRoundRuleContext(round)
    if (!npc.isAlive) return false
    if (npc.powerBase === 'court') return rule.omenNpcIds.includes(npc.id)
    if (npc.powerBase === 'external') {
        return rule.allowExternalOmen && npc.externalStatus !== 'secession' && npc.externalStatus !== 'rebellion'
    }
    return false
}
```

- [ ] **Step 5: Run targeted test**

Run:

```bash
npm test -- src/data/roundRuleConfig.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/roundRuleConfig.ts src/data/roundRuleConfig.test.ts
git commit -m "feat: expand omen availability"
```

---

### Task 4: Add Omen-Specific Success Rate

**Files:**
- Modify: `src/game/schemeEngine.ts`
- Test: `src/game/schemeEngine.test.ts`

- [ ] **Step 1: Add failing success-rate tests**

Append to `src/game/schemeEngine.test.ts`:

```ts
it('calculates omen success without trust bonus', () => {
    const strongOmen = makeNorthParse({
        eventFit: 0.7,
        exposureRisk: 0.15,
        omenPolarity: 'destabilizing',
        omenAnchorStrength: 0.8,
        legitimacyCrack: 0.75,
        suspicionDirection: 0.68,
        omenAccusationClarity: 0.7,
        centralSanctionLeverage: 0.62,
    })
    const lowTrust = calculateParsedSuccessRate('omen', 5, -1, false, strongOmen, 'normal')
    const highTrust = calculateParsedSuccessRate('omen', 95, -1, false, strongOmen, 'normal')

    expect(highTrust).toBeCloseTo(lowTrust, 5)
    expect(lowTrust).toBeGreaterThanOrEqual(0.74)
})

it('penalizes vague omen quality even with high base success', () => {
    const vague = calculateParsedSuccessRate('omen', 95, -1, false, makeNorthParse({
        eventFit: 0.2,
        exposureRisk: 0.1,
        omenPolarity: 'vague_or_ceremonial',
        omenAnchorStrength: 0.1,
        legitimacyCrack: 0.05,
        suspicionDirection: 0.05,
        omenAccusationClarity: 0.04,
        centralSanctionLeverage: 0.04,
    }), 'normal')

    expect(vague).toBeLessThan(0.74)
    expect(vague).toBeGreaterThan(0.5)
})
```

- [ ] **Step 2: Run targeted test to verify failure**

Run:

```bash
npm test -- src/game/schemeEngine.test.ts
```

Expected: FAIL because high trust still increases omen success.

- [ ] **Step 3: Add omen base rate helper**

In `src/game/schemeEngine.ts`, add near `calculateSuccessRate`:

```ts
function getOmenBaseRate(difficulty: GameDifficulty): number {
    switch (difficulty) {
        case 'easy':
            return 0.82
        case 'hard':
            return 0.68
        case 'hell':
            return 0.62
        case 'normal':
        default:
            return 0.74
    }
}

function calculateOmenSuccessRate(
    parse: NorthSchemeParseResult,
    sameNpcSameRound: boolean,
    difficulty: GameDifficulty,
): number {
    const profile = getDifficultyProfile(difficulty)
    const qualityBoost =
        (parse.omenAnchorStrength ?? 0) * 0.08
        + Math.max(parse.legitimacyCrack ?? 0, parse.omenAccusationClarity ?? 0) * 0.07
        + Math.max(parse.suspicionDirection ?? 0, parse.centralSanctionLeverage ?? 0) * 0.06
        + parse.eventFit * 0.05
    const vaguePenalty = parse.omenPolarity === 'vague_or_ceremonial' ? 0.08 : 0
    const repeatPenalty = sameNpcSameRound ? 0.1 : 0

    return clamp(
        getOmenBaseRate(difficulty)
        + qualityBoost
        - vaguePenalty
        - repeatPenalty
        - parse.exposureRisk * profile.scheme.exposurePenaltyWeight,
        0.12,
        0.96,
    )
}
```

- [ ] **Step 4: Route omen through the new helper**

At the top of `calculateParsedSuccessRate`, add:

```ts
    if (schemeType === 'omen') {
        return calculateOmenSuccessRate(parse, sameNpcSameRound, difficulty)
    }
```

- [ ] **Step 5: Run targeted test**

Run:

```bash
npm test -- src/game/schemeEngine.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/game/schemeEngine.ts src/game/schemeEngine.test.ts
git commit -m "feat: use omen-specific success rate"
```

---

### Task 5: Implement External Omen Numeric Effects

**Files:**
- Modify: `src/game/schemeEngine.ts`
- Modify: `src/game/roundSettlement.ts`
- Test: `src/game/schemeEngine.test.ts`
- Test: `src/game/roundSettlement.test.ts`

- [ ] **Step 1: Add failing scheme result test**

Append to `src/game/schemeEngine.test.ts`:

```ts
it('external omen success lowers loyalty more than military power', () => {
    const npc = INITIAL_NPCS.find(item => item.id === 'hebaboguì')!
    const result = settleScheme(
        {
            targetNpcId: npc.id,
            schemeType: 'omen',
            playerSpeech: '白鱼入营，鳞有反文，此乃外镇拥兵自重之兆；请朝廷缓发军资，先查账册。',
            resolutionRoll: 0.01,
            northParse: makeNorthParse({
                eventFit: 0.8,
                militaryRelevance: 0.7,
                grainRelevance: 0.72,
                governanceRelevance: 0.7,
                omenPolarity: 'destabilizing',
                omenAnchorStrength: 0.78,
                legitimacyCrack: 0.48,
                suspicionDirection: 0.74,
                omenAccusationClarity: 0.82,
                centralSanctionLeverage: 0.86,
            }),
        },
        npc,
        null,
        0,
        { round: 15, unlockedSecrets: 0, difficulty: 'normal' },
    )

    expect(result.success).toBe(true)
    expect(result.personEffects.loyaltyDelta).toBeLessThanOrEqual(-6)
    expect(result.personEffects.militaryPowerDelta ?? 0).toBeLessThan(0)
    expect(Math.abs(result.personEffects.loyaltyDelta)).toBeGreaterThan(Math.abs(result.personEffects.militaryPowerDelta ?? 0))
})
```

Expected failure: `militaryPowerDelta` does not exist and external omen has no loyalty drop.

- [ ] **Step 2: Add failing settlement persistence test**

Append to `src/game/roundSettlement.test.ts`:

```ts
it('applies external omen military and loyalty deltas to the target warlord', () => {
    const hebabogui = INITIAL_NPCS.find(item => item.id === 'hebaboguì')!
    const result = settleRound({
        round: 15,
        schemes: [{
            id: 'external-omen-sanction',
            targetNpcId: hebabogui.id,
            schemeType: 'omen',
            playerSpeech: '白鱼入营，鳞有反文，此乃外镇拥兵自重之兆；请朝廷缓发军资，先查账册。',
            resolutionRoll: 0.01,
            northParse: {
                characterFit: 0.72,
                eventFit: 0.8,
                structuralPenetration: 0.66,
                executability: 0.7,
                exposureRisk: 0.14,
                financeRelevance: 0.24,
                grainRelevance: 0.72,
                militaryRelevance: 0.7,
                socialOrderRelevance: 0.24,
                governanceRelevance: 0.7,
                dominantIntent: 'strategize',
                omenPolarity: 'destabilizing',
                omenAnchorStrength: 0.78,
                legitimacyCrack: 0.48,
                suspicionDirection: 0.74,
                omenAccusationClarity: 0.82,
                centralSanctionLeverage: 0.86,
                evidence: [],
            },
        }],
        northStats: { ...NORTH_INITIAL },
        southStats: { ...SOUTH_INITIAL },
        npcs: INITIAL_NPCS.map(npc => ({ ...npc })),
        factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
        intelProgress: {},
        policyOptionIndex: null,
        policyReason: '',
    }) as any

    const updated = result.updatedNpcs.find((item: any) => item.id === hebabogui.id)!
    expect(updated.loyaltyToCourt).toBeLessThan(hebabogui.loyaltyToCourt)
    expect(updated.militaryPower).toBeLessThan(hebabogui.militaryPower)
})
```

- [ ] **Step 3: Add optional military delta to person effects**

In `src/game/schemeEngine.ts`, extend `PersonEffects`:

```ts
    militaryPowerDelta?: number
```

Set `militaryPowerDelta: 0` in `emptyPerson`.

Update `scalePersonEffects`:

```ts
        militaryPowerDelta: Math.round((person.militaryPowerDelta ?? 0) * multiplier),
```

- [ ] **Step 4: Add external omen effect helper**

In `src/game/schemeEngine.ts`, add:

```ts
function deriveExternalOmenPersonEffects(parse: NorthSchemeParseResult): Pick<PersonEffects, 'loyaltyDelta' | 'militaryPowerDelta'> {
    const accusation = parse.omenAccusationClarity ?? 0
    const sanction = parse.centralSanctionLeverage ?? 0
    const suspicion = parse.suspicionDirection ?? 0
    const supplySignal = Math.max(parse.grainRelevance, parse.militaryRelevance, parse.governanceRelevance)
    const trigger = Math.max(accusation, sanction)

    if (trigger < 0.42 || sanction < 0.34) {
        return { loyaltyDelta: 0, militaryPowerDelta: 0 }
    }

    const loyaltyLoss = Math.round(5 + accusation * 4 + sanction * 4 + suspicion * 2)
    const militaryLoss = Math.round(1 + supplySignal * 2 + sanction * 1)

    return {
        loyaltyDelta: -clamp(loyaltyLoss, 6, 12),
        militaryPowerDelta: -clamp(militaryLoss, 1, 3),
    }
}
```

- [ ] **Step 5: Use helper in omen success template**

In `getSuccessTemplate`, replace the `case 'omen'` return with:

```ts
        case 'omen':
            if (targetNpc.powerBase === 'external') {
                const externalOmenEffects = deriveExternalOmenPersonEffects(parse ?? {
                    characterFit: 0,
                    eventFit: 0,
                    structuralPenetration: 0,
                    executability: 0,
                    exposureRisk: 0,
                    financeRelevance: 0,
                    grainRelevance: 0,
                    militaryRelevance: 0,
                    socialOrderRelevance: 0,
                    governanceRelevance: 0,
                    dominantIntent: 'neutral',
                    evidence: [],
                })
                return {
                    person: {
                        ...emptyPerson,
                        trustDelta: 1,
                        loyaltyDelta: externalOmenEffects.loyaltyDelta,
                        militaryPowerDelta: externalOmenEffects.militaryPowerDelta,
                        alignmentShift: externalOmenEffects.loyaltyDelta < 0 ? 'self' : null,
                    },
                    factionEffects,
                    specialAction: null,
                }
            }
            return {
                person: { ...emptyPerson, trustDelta: 1 },
                factionEffects,
                specialAction: null,
            }
```

- [ ] **Step 6: Apply military delta in settlement**

In `src/game/roundSettlement.ts`, change `applyPersonEffects` signature:

```ts
    militaryPowerDelta: number = 0,
```

Inside it, add:

```ts
    npc.militaryPower = clamp(npc.militaryPower + militaryPowerDelta)
```

Update calls:

```ts
applyPersonEffects(
    targetNpc,
    result.personEffects.trustDelta,
    result.personEffects.loyaltyDelta,
    result.personEffects.alignmentShift,
    result.personEffects.externalStatus,
    result.personEffects.militaryPowerDelta ?? 0,
)
```

Keep related NPC call with final argument `0`.

- [ ] **Step 7: Run targeted tests**

Run:

```bash
npm test -- src/game/schemeEngine.test.ts src/game/roundSettlement.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/game/schemeEngine.ts src/game/schemeEngine.test.ts src/game/roundSettlement.ts src/game/roundSettlement.test.ts
git commit -m "feat: apply external omen sanctions"
```

---

### Task 6: Add Omen Echo Speaker Selection And Prompt

**Files:**
- Create: `src/game/omenEcho.ts`
- Modify: `src/ai/prompts.ts`
- Test: `src/game/omenEcho.test.ts`
- Test: `src/ai/prompts.test.ts`

- [ ] **Step 1: Add failing speaker-selection test**

Create `src/game/omenEcho.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { INITIAL_NPCS } from '../data/npcs'
import { selectOmenEchoSpeaker, buildFallbackOmenEchoText } from './omenEcho'

describe('omenEcho', () => {
    it('selects a living court speaker for external omen echo', () => {
        const target = INITIAL_NPCS.find(npc => npc.id === 'hebaboguì')!
        const speaker = selectOmenEchoSpeaker({
            round: 15,
            actionIndex: 0,
            targetNpc: target,
            npcs: INITIAL_NPCS,
            parse: {
                characterFit: 0.4,
                eventFit: 0.8,
                structuralPenetration: 0.6,
                executability: 0.6,
                exposureRisk: 0.2,
                financeRelevance: 0.2,
                grainRelevance: 0.7,
                militaryRelevance: 0.7,
                socialOrderRelevance: 0.4,
                governanceRelevance: 0.7,
                dominantIntent: 'divide',
                omenPolarity: 'destabilizing',
                omenAnchorStrength: 0.7,
                legitimacyCrack: 0.4,
                suspicionDirection: 0.8,
                omenAccusationClarity: 0.8,
                centralSanctionLeverage: 0.8,
                evidence: [],
            },
        })

        expect(speaker?.powerBase).toBe('court')
        expect(speaker?.isAlive).toBe(true)
        expect(speaker?.id).not.toBe(target.id)
    })

    it('builds external omen fallback text with supply sanction language', () => {
        const target = INITIAL_NPCS.find(npc => npc.id === 'hebaboguì')!
        const speaker = INITIAL_NPCS.find(npc => npc.id === 'zuting')!
        const text = buildFallbackOmenEchoText({
            targetNpc: target,
            speakerNpc: speaker,
            parse: {
                characterFit: 0.4,
                eventFit: 0.8,
                structuralPenetration: 0.6,
                executability: 0.6,
                exposureRisk: 0.2,
                financeRelevance: 0.2,
                grainRelevance: 0.7,
                militaryRelevance: 0.7,
                socialOrderRelevance: 0.4,
                governanceRelevance: 0.7,
                dominantIntent: 'divide',
                omenPolarity: 'destabilizing',
                omenAnchorStrength: 0.7,
                legitimacyCrack: 0.4,
                suspicionDirection: 0.8,
                omenAccusationClarity: 0.8,
                centralSanctionLeverage: 0.8,
                evidence: [],
            },
        })

        expect(text).toMatch(/粮饷|军资|兵器|甲胄|监军|账册/)
    })
})
```

Expected failure: module does not exist.

- [ ] **Step 2: Create omen echo helper**

Create `src/game/omenEcho.ts`:

```ts
import type { NPC, NorthSchemeParseResult } from './types'

function stableScore(seed: string): number {
    let hash = 0
    for (const char of seed) {
        hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0
    }
    return Math.abs(hash % 100) / 100
}

function isTerminalCourtNpc(npc: NPC): boolean {
    return npc.powerBase !== 'court' || !npc.isAlive || npc.courtStatus === 'dismissed' || npc.courtStatus === 'executed'
}

export function selectOmenEchoSpeaker(params: {
    round: number
    actionIndex: number
    targetNpc: NPC
    npcs: NPC[]
    parse: NorthSchemeParseResult
}): NPC | null {
    const candidates = params.npcs.filter(npc => !isTerminalCourtNpc(npc) && npc.id !== params.targetNpc.id)
    if (candidates.length === 0) return null

    const scored = candidates.map(npc => {
        const authority =
            npc.id === 'hebaqí' ? 0.28
                : npc.id === 'zuting' ? 0.24
                    : npc.id === 'linghuelvguang' ? 0.2
                        : npc.id === 'zongai' ? 0.18
                            : npc.id === 'yuwendi' ? 0.14
                                : 0.06
        const externalFit = params.targetNpc.powerBase === 'external'
            ? (['hebaqí', 'zuting', 'linghuelvguang', 'zongai', 'yuwendi'].includes(npc.id) ? 0.26 : 0)
            : 0
        const sanctionFit = (params.parse.centralSanctionLeverage ?? 0) * (npc.id === 'zuting' || npc.id === 'linghuelvguang' ? 0.18 : 0.08)
        const suspicionFit = (params.parse.suspicionDirection ?? 0) * (npc.factionId !== params.targetNpc.factionId ? 0.12 : 0.04)
        const tieBreak = stableScore(`${params.round}:${params.actionIndex}:${params.targetNpc.id}:${npc.id}`) * 0.03
        return { npc, score: authority + externalFit + sanctionFit + suspicionFit + tieBreak }
    })

    scored.sort((a, b) => b.score - a.score)
    return scored[0]?.npc ?? null
}

export function buildFallbackOmenEchoText(params: {
    targetNpc: NPC
    speakerNpc: NPC | null
    parse: NorthSchemeParseResult
}): string {
    const speakerName = params.speakerNpc?.name ?? '朝中有人'
    if (params.targetNpc.powerBase === 'external') {
        const strong = (params.parse.centralSanctionLeverage ?? 0) >= 0.5
        return strong
            ? `${speakerName}顺着谶辞起疑，主张先压住${params.targetNpc.name}的粮饷军资，兵器甲胄缓发，军需账册也要重查。`
            : `${speakerName}听闻此谶，只说外镇之事不可不察，但风声尚浅，一时还难化成明面处分。`
    }

    if (params.parse.omenPolarity === 'destabilizing') {
        return `${speakerName}没有明言信谶，却已把这句征兆引入朝议，名分与人心因此多了一层疑影。`
    }

    if (params.parse.omenPolarity === 'legitimizing') {
        return `${speakerName}反把此谶解释为修德安民之戒，朝中一时更愿以整饬法统来压住流言。`
    }

    return `${speakerName}只将此事视作怪谈，风声虽起，却还未真正入朝议。`
}
```

- [ ] **Step 3: Add failing prompt test for echo prompt**

Append to `src/ai/prompts.test.ts`:

```ts
it('builds omen echo prompt with speaker, target, and sanction context', () => {
    const targetNpc = INITIAL_NPCS.find(item => item.id === 'hebaboguì')!
    const speakerNpc = INITIAL_NPCS.find(item => item.id === 'zuting')!
    const prompt = buildOmenEchoPrompt({
        round: 15,
        eventName: '河北豪强兼并、流民滋生，地方控制力下降',
        eventBriefing: '地方控制力正在滑出朝廷掌心。',
        speakerNpc,
        targetNpc,
        omenText: '白鱼入营，鳞有反文',
        interpretationText: '外镇拥兵自重，请朝廷缓发军资，先查账册',
        parse: {
            ...makeNorthParse(),
            omenPolarity: 'destabilizing',
            omenAccusationClarity: 0.82,
            centralSanctionLeverage: 0.86,
        },
        localEffectHint: '朝廷开始怀疑贺拔伯圭，军资被缓发，忠诚明显下降。',
    }).map(item => item.content).join('\n')

    expect(prompt).toContain('祖廷')
    expect(prompt).toContain('贺拔伯圭')
    expect(prompt).toContain('缓发军资')
    expect(prompt).toContain('不得直接罗列数值')
})
```

Expected failure: `buildOmenEchoPrompt` does not exist.

- [ ] **Step 4: Add `buildOmenEchoPrompt`**

In `src/ai/prompts.ts`, export:

```ts
export function buildOmenEchoPrompt(params: {
    round: number
    eventName: string
    eventBriefing: string
    speakerNpc: NPC
    targetNpc: NPC
    omenText: string
    interpretationText: string
    parse: NorthSchemeParseResult
    localEffectHint: string
}): ChatMessage[] {
    return [
        {
            role: 'system',
            content: `你是《佞臣》中的谶纬回响写作引擎。你只能输出给玩家看的朝堂回响正文，不得输出 JSON、标题或数值。`,
        },
        {
            role: 'user',
            content: `第${params.round}回合：${params.eventName}
局势：${params.eventBriefing}
发声者：${params.speakerNpc.name}（${params.speakerNpc.title}）
发声者立场：${params.speakerNpc.publicStance}
发声者性格：${params.speakerNpc.personality}
被谶纬指向者：${params.targetNpc.name}（${params.targetNpc.title}）
被指向者类型：${params.targetNpc.powerBase === 'external' ? '地方军头' : '朝堂角色'}
谶辞 / 征兆：${params.omenText || '未填'}
解释 / 指向：${params.interpretationText || '未填'}
本地效果提示：${params.localEffectHint}
解析方向：${params.parse.omenPolarity ?? 'vague_or_ceremonial'}，指控清晰度 ${params.parse.omenAccusationClarity ?? 0}，中枢制裁抓手 ${params.parse.centralSanctionLeverage ?? 0}

请以${params.speakerNpc.name}的口吻生成一段 80 到 140 字的谶纬回响。
要求：
- 只写发声者如何解释、利用或压下这段谶纬。
- 若被指向者是地方军头，必须自然写出中枢怀疑后的动作倾向，例如削粮饷、缓发兵器甲胄、查账册、派监军。
- 不得直接罗列数值，不得说“忠诚度下降”“军力下降”。
- 不要再向玩家提问。`,
        },
    ]
}
```

- [ ] **Step 5: Run targeted tests**

Run:

```bash
npm test -- src/game/omenEcho.test.ts src/ai/prompts.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/game/omenEcho.ts src/game/omenEcho.test.ts src/ai/prompts.ts src/ai/prompts.test.ts
git commit -m "feat: add omen echo prompts"
```

---

### Task 7: Store And Render Omen Echoes

**Files:**
- Modify: `src/stores/gameStore.ts`
- Modify: `src/components/SchemeFeedback/SchemeFeedback.tsx`
- Modify: `src/components/SchemeFeedback/SchemeFeedback.css`
- Test: `src/stores/gameStore.test.ts`
- Test: `src/components/SchemeFeedback/SchemeFeedback.test.tsx`

- [ ] **Step 1: Add failing store test**

Append to `src/stores/gameStore.test.ts`:

```ts
it('can attach omen echo feedback to an npc feedback card', () => {
    const store = useGameStore.getState()
    store.addNpcFeedback({
        id: 'omen-1',
        npcId: 'hebaboguì',
        npcName: '贺拔伯圭',
        schemeType: 'omen',
        schemeName: '谶纬',
        playerSpeech: '白鱼入营，鳞有反文',
        feedback: '',
        isLoading: true,
        source: '测试',
    })

    store.updateNpcFeedbackOmenEcho('omen-1', {
        speakerNpcId: 'zuting',
        speakerNpcName: '祖廷',
        speakerTitle: '尚书左仆射',
        text: '祖廷顺着谶辞起疑，主张先压住粮饷军资。',
        source: '测试',
    })

    expect(useGameStore.getState().npcFeedbacks[0]?.omenEcho?.speakerNpcName).toBe('祖廷')
})
```

Expected failure: action and field do not exist.

- [ ] **Step 2: Extend store type and action**

In `src/stores/gameStore.ts`, import `OmenEchoFeedback` from `../game/types`.

Extend `NpcFeedback`:

```ts
    omenEcho?: OmenEchoFeedback
```

Add action signature to `GameState`:

```ts
    updateNpcFeedbackOmenEcho: (feedbackId: string, omenEcho: OmenEchoFeedback) => void
```

Add implementation near `updateNpcFeedback`:

```ts
    updateNpcFeedbackOmenEcho: (feedbackId: string, omenEcho: OmenEchoFeedback) => {
        set({
            npcFeedbacks: get().npcFeedbacks.map(f =>
                f.id === feedbackId ? { ...f, omenEcho } : f,
            ),
        })
    },
```

- [ ] **Step 3: Add failing source test for UI rendering**

Append to `src/components/SchemeFeedback/SchemeFeedback.test.tsx`:

```ts
it('renders omen echo block only for omen feedback', () => {
    expect(schemeFeedbackSource).toContain('feedback-omen-echo')
    expect(schemeFeedbackSource).toContain('谶纬回响')
    expect(schemeFeedbackSource).toContain('fb.schemeType === \\'omen\\'')
})
```

Expected failure: source does not contain echo block.

- [ ] **Step 4: Render echo block**

In `src/components/SchemeFeedback/SchemeFeedback.tsx`, after the main feedback text area and before follow-up rendering, add:

```tsx
                            {fb.schemeType === 'omen' && fb.omenEcho && !fb.isLoading && (
                                <div className="feedback-omen-echo glass-panel">
                                    <div className="feedback-omen-echo-label">谶纬回响</div>
                                    <div className="feedback-omen-echo-speaker">
                                        {fb.omenEcho.speakerNpcName} · {fb.omenEcho.speakerTitle}
                                    </div>
                                    <p className="feedback-omen-echo-text">{sanitizeNpcReplyText(fb.omenEcho.text)}</p>
                                </div>
                            )}
```

- [ ] **Step 5: Style echo block**

Append to `src/components/SchemeFeedback/SchemeFeedback.css`:

```css
.feedback-omen-echo {
    position: relative;
    margin: 1rem 0 0;
    padding: 1rem 1.1rem;
    border-color: rgba(213, 185, 94, 0.34);
    background:
        radial-gradient(circle at 18% 0%, rgba(213, 185, 94, 0.15), transparent 34%),
        rgba(16, 15, 22, 0.72);
}

.feedback-omen-echo-label {
    color: var(--color-gold);
    font-size: 0.82rem;
    letter-spacing: 0.18em;
    margin-bottom: 0.45rem;
}

.feedback-omen-echo-speaker {
    color: rgba(244, 235, 206, 0.86);
    font-size: 0.92rem;
    margin-bottom: 0.55rem;
}

.feedback-omen-echo-text {
    color: rgba(238, 232, 218, 0.88);
    line-height: 1.85;
    margin: 0;
}
```

- [ ] **Step 6: Run targeted tests**

Run:

```bash
npm test -- src/stores/gameStore.test.ts src/components/SchemeFeedback/SchemeFeedback.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/stores/gameStore.ts src/stores/gameStore.test.ts src/components/SchemeFeedback/SchemeFeedback.tsx src/components/SchemeFeedback/SchemeFeedback.css src/components/SchemeFeedback/SchemeFeedback.test.tsx
git commit -m "feat: render omen echo feedback"
```

---

### Task 8: Generate Omen Echo During Feedback Orchestration

**Files:**
- Modify: `src/components/SchemeFeedback/SchemeFeedback.tsx`
- Modify: `src/ai/prompts.ts`
- Test: `src/components/SchemeFeedback/SchemeFeedback.test.tsx`

- [ ] **Step 1: Add failing source orchestration test**

Append to `src/components/SchemeFeedback/SchemeFeedback.test.tsx`:

```ts
it('generates omen echo during feedback orchestration without replacing npc reply', () => {
    expect(schemeFeedbackSource).toContain('buildOmenEchoPrompt')
    expect(schemeFeedbackSource).toContain('selectOmenEchoSpeaker')
    expect(schemeFeedbackSource).toContain('updateNpcFeedbackOmenEcho')
    expect(schemeFeedbackSource).toContain('buildFallbackOmenEchoText')
})
```

Expected failure: orchestration does not use these helpers.

- [ ] **Step 2: Import helpers**

In `src/components/SchemeFeedback/SchemeFeedback.tsx`, update imports:

```ts
import { buildNpcFollowUpFinalPrompt, buildNpcPrompt, buildOmenEchoPrompt, sanitizeNpcReplyText } from '../../ai/prompts'
import { buildFallbackOmenEchoText, selectOmenEchoSpeaker } from '../../game/omenEcho'
```

Include `updateNpcFeedbackOmenEcho` in the store destructure and orchestration snapshot.

- [ ] **Step 3: Add local effect hint helper**

Inside `SchemeFeedback.tsx`, near local fallback helpers, add:

```ts
function buildOmenLocalEffectHint(targetNpcName: string, parse: { centralSanctionLeverage?: number; omenPolarity?: string }): string {
    if ((parse.centralSanctionLeverage ?? 0) >= 0.5) {
        return `朝廷开始怀疑${targetNpcName}，粮饷军资可能被缓发或清查。`
    }
    if (parse.omenPolarity === 'destabilizing') {
        return `此谶被解释为名分不稳与人心疑惧。`
    }
    if (parse.omenPolarity === 'legitimizing') {
        return `此谶被解释为修德安民、补正法统的警示。`
    }
    return `此谶风声较浅，尚未形成明确朝议。`
}
```

- [ ] **Step 4: Generate echo for parsed omen actions**

Inside the feedback orchestration loop, after `success` is computed and before or alongside the NPC reply call, add a helper:

```ts
                const generateOmenEcho = async () => {
                    if (item.action.schemeType !== 'omen' || !item.action.id) return
                    const speaker = selectOmenEchoSpeaker({
                        round: currentRound,
                        actionIndex: item.index,
                        targetNpc: item.targetNpc,
                        npcs: snapshot.npcs,
                        parse: item.parsed,
                    })
                    const fallbackText = buildFallbackOmenEchoText({
                        targetNpc: item.targetNpc,
                        speakerNpc: speaker,
                        parse: item.parsed,
                    })
                    const fallbackEcho = {
                        speakerNpcId: speaker?.id ?? 'court',
                        speakerNpcName: speaker?.name ?? '朝中风声',
                        speakerTitle: speaker?.title ?? '朝议',
                        text: fallbackText,
                        source: '本地兜底',
                    }

                    if (!speaker) {
                        snapshot.updateNpcFeedbackOmenEcho(item.feedbackId, fallbackEcho)
                        return
                    }

                    try {
                        const echoText = await chatCompletion(
                            buildOmenEchoPrompt({
                                round: currentRound,
                                eventName: snapshot.currentRoundEvent.eventName,
                                eventBriefing: snapshot.currentRoundEvent.eventBriefing,
                                speakerNpc: speaker,
                                targetNpc: item.targetNpc,
                                omenText: item.action.omenSpeechInput?.omenText ?? '',
                                interpretationText: item.action.omenSpeechInput?.interpretationText ?? item.action.playerSpeech,
                                parse: item.parsed,
                                localEffectHint: buildOmenLocalEffectHint(item.targetNpc.name, item.parsed),
                            }),
                            {
                                temperature: 0.72,
                                maxTokens: 260,
                                tag: `omen_echo_${item.targetNpc.id}`,
                            },
                        )
                        if (cancelled) return
                        snapshot.updateNpcFeedbackOmenEcho(item.feedbackId, {
                            speakerNpcId: speaker.id,
                            speakerNpcName: speaker.name,
                            speakerTitle: speaker.title,
                            text: sanitizeNpcReplyText(echoText.trim()) || fallbackText,
                            source: getAiMode() === 'fallback' ? '本地兜底' : getAiModeLabel(),
                        })
                    } catch {
                        if (!cancelled) snapshot.updateNpcFeedbackOmenEcho(item.feedbackId, fallbackEcho)
                    }
                }
```

- [ ] **Step 5: Run NPC reply and omen echo in parallel**

In the existing `try` block that generates `reply`, replace the single await with:

```ts
                    const [reply] = await Promise.all([
                        chatCompletion(
                            buildNpcPrompt({
                                npc: item.targetNpc,
                                schemeType: item.action.schemeType,
                                speech: item.action.playerSpeech,
                                success,
                                followUpMode: candidateId && item.action.id === candidateId ? 'question_candidate' : 'statement_only',
                                round: currentRound,
                                eventName: snapshot.currentRoundEvent.eventName,
                                eventBriefing: snapshot.currentRoundEvent.eventBriefing,
                                knownSecretThreads: item.knownSecretThreads,
                                previousDealings: item.dynamicContext.previousDealings,
                                relationshipTemperature: item.dynamicContext.relationshipTemperature,
                                recentCourtFortune: item.dynamicContext.recentCourtFortune,
                                factionPressure: item.dynamicContext.factionPressure,
                                longTermMemorySummary: item.dynamicContext.longTermMemorySummary,
                                relationMemorySummary: item.dynamicContext.relationMemorySummary,
                            }),
                            {
                                temperature: 0.75,
                                maxTokens: 420,
                                tag: `npc_${item.action.schemeType}_${success ? 'success' : 'failure'}`,
                            },
                        ),
                        generateOmenEcho(),
                    ])
```

Keep the existing reply normalization code after this block.

- [ ] **Step 6: Ensure existing prefetched replies do not skip echo**

In the branch `if (existingFeedback && !existingFeedback.isLoading)`, call `await generateOmenEcho()` before `continue` when `item.action.schemeType === 'omen' && !existingFeedback.omenEcho`.

- [ ] **Step 7: Run targeted test**

Run:

```bash
npm test -- src/components/SchemeFeedback/SchemeFeedback.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/SchemeFeedback/SchemeFeedback.tsx src/components/SchemeFeedback/SchemeFeedback.test.tsx
git commit -m "feat: generate omen echo feedback"
```

---

### Task 9: Add Omen-Specific NPC Response Guidance

**Files:**
- Modify: `src/ai/prompts.ts`
- Test: `src/ai/prompts.test.ts`

- [ ] **Step 1: Add failing prompt tests**

Append to `src/ai/prompts.test.ts`:

```ts
it('adds omen-specific npc response guidance for court and external targets', () => {
    const courtNpc = INITIAL_NPCS.find(item => item.id === 'zongai')!
    const externalNpc = INITIAL_NPCS.find(item => item.id === 'hebaboguì')!

    const courtPrompt = buildNpcPrompt({
        npc: courtNpc,
        schemeType: 'omen',
        speech: '黄河赤光入宫墙，此乃内廷传命不明。',
        success: true,
    }).map(item => item.content).join('\n')

    const externalPrompt = buildNpcPrompt({
        npc: externalNpc,
        schemeType: 'omen',
        speech: '白鱼入营，鳞有反文，此乃外镇拥兵自重。',
        success: true,
    }).map(item => item.content).join('\n')

    expect(courtPrompt).toContain('谶纬回应')
    expect(courtPrompt).toContain('信、疑、惧、怒')
    expect(externalPrompt).toContain('中枢猜疑')
    expect(externalPrompt).toContain('粮饷')
})
```

Expected failure: prompt lacks these guidance strings.

- [ ] **Step 2: Add scheme guidance helper**

In `src/ai/prompts.ts`, add near `getNpcSelfReference`:

```ts
function getSchemeResponseGuidance(npc: NPC, schemeType: SchemeType): string {
    if (schemeType !== 'omen') return ''
    if (npc.powerBase === 'external') {
        return '谶纬回应：你听到的不是普通劝说，而是一段可能让中枢猜疑你的灾异解释。回应要体现你对粮饷、兵器甲胄、监军、军需账册被卡的警觉，不要像朝臣一样空谈法统。'
    }
    return '谶纬回应：你听到的是灾异、征兆与名分解释。回应要体现人物面对谶纬时的信、疑、惧、怒、借题发挥、急于撇清或压住流言，而不是只给普通态度表态。'
}
```

Inside `buildNpcPrompt`, compute:

```ts
    const schemeResponseGuidance = getSchemeResponseGuidance(npc, schemeType)
```

Insert into prompt after `selfReferenceLine`:

```ts
${schemeResponseGuidance ? `${schemeResponseGuidance}\n` : ''}
```

- [ ] **Step 3: Run targeted test**

Run:

```bash
npm test -- src/ai/prompts.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/ai/prompts.ts src/ai/prompts.test.ts
git commit -m "feat: guide omen npc replies"
```

---

### Task 10: Settlement Copy And Memory Hook Check

**Files:**
- Modify: `src/game/schemeEngine.ts`
- Modify: `src/game/npcMemoryLedger.ts`
- Test: `src/game/schemeEngine.test.ts`
- Test: `src/game/npcMemoryLedger.test.ts`

- [ ] **Step 1: Add failing feedback text test**

Append to `src/game/schemeEngine.test.ts`:

```ts
it('explains external omen sanctions in settlement feedback text', () => {
    const npc = INITIAL_NPCS.find(item => item.id === 'hebaboguì')!
    const result = settleScheme(
        {
            targetNpcId: npc.id,
            schemeType: 'omen',
            playerSpeech: '白鱼入营，鳞有反文，此乃外镇拥兵自重之兆；请朝廷缓发军资，先查账册。',
            resolutionRoll: 0.01,
            northParse: makeNorthParse({
                eventFit: 0.8,
                militaryRelevance: 0.7,
                grainRelevance: 0.72,
                governanceRelevance: 0.7,
                omenPolarity: 'destabilizing',
                omenAnchorStrength: 0.78,
                suspicionDirection: 0.74,
                omenAccusationClarity: 0.82,
                centralSanctionLeverage: 0.86,
            }),
        },
        npc,
        null,
        0,
        { round: 15, unlockedSecrets: 0, difficulty: 'normal' },
    )

    expect(result.feedbackText).toMatch(/粮饷|军资|兵器|甲胄|监军|账册/)
})
```

Expected failure: generic omen feedback does not mention supply sanctions.

- [ ] **Step 2: Update omen feedback generator**

In `generateFeedback` in `src/game/schemeEngine.ts`, add an external omen branch before existing omen text:

```ts
    if (action.schemeType === 'omen' && npc.powerBase === 'external' && success) {
        if ((parse.centralSanctionLeverage ?? 0) >= 0.42) {
            return `${npc.name}被谶辞牵入中枢疑影，粮饷军资随之被压，兵器甲胄与账册清查也成了朝议里的抓手。`
        }
        return `${npc.name}虽被谶辞带上疑名，但风声尚浅，朝中一时还未形成明面制裁。`
    }
```

- [ ] **Step 3: Add memory test**

Append to `src/game/npcMemoryLedger.test.ts`:

```ts
it('records external omen supply suspicion as npc memory', () => {
    const npc = INITIAL_NPCS.find(item => item.id === 'hebaboguì')!
    const before = { ...npc }
    const after = { ...npc, loyaltyToCourt: npc.loyaltyToCourt - 10, militaryPower: npc.militaryPower - 2 }
    const entries = deriveNpcMemoryEntriesForRound({
        round: 15,
        schemes: [{
            targetNpcId: npc.id,
            schemeType: 'omen',
            playerSpeech: '白鱼入营，鳞有反文，此乃外镇拥兵自重之兆；请朝廷缓发军资，先查账册。',
        }],
        schemeResults: [
            makeSchemeResult({
                feedbackText: '贺拔伯圭被谶辞牵入中枢疑影，粮饷军资随之被压。',
                success: true,
                personEffects: {
                    trustDelta: 1,
                    relatedTrustDelta: 0,
                    loyaltyDelta: -10,
                    relatedLoyaltyDelta: 0,
                    alignmentShift: 'self',
                    intelDelta: 0,
                    externalStatus: null,
                    militaryPowerDelta: -2,
                },
                northParse: {
                    ...makeSchemeResult().northParse,
                    omenPolarity: 'destabilizing',
                    omenAccusationClarity: 0.82,
                    centralSanctionLeverage: 0.86,
                },
            }),
        ],
        npcsBefore: [before],
        npcsAfter: [after],
        externalActionReports: [],
    })

    expect(entries.some(entry => entry.npcId === npc.id && /粮饷|军资|中枢/.test(entry.summary))).toBe(true)
})
```

- [ ] **Step 4: Update memory summary**

In `src/game/npcMemoryLedger.ts`, inside the omen branch, make external sanction text explicit:

```ts
    if (schemeType === 'omen' && targetNpc.powerBase === 'external' && (result.northParse.centralSanctionLeverage ?? 0) >= 0.42) {
        return `${targetNpc.name}记得你曾借谶纬把他牵入中枢疑影，使朝廷疑其异心并压住粮饷军资。`
    }
```

Place this before generic omen memory text.

- [ ] **Step 5: Run targeted tests**

Run:

```bash
npm test -- src/game/schemeEngine.test.ts src/game/npcMemoryLedger.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/game/schemeEngine.ts src/game/schemeEngine.test.ts src/game/npcMemoryLedger.ts src/game/npcMemoryLedger.test.ts
git commit -m "feat: explain external omen sanctions"
```

---

### Task 11: Final Verification

**Files:**
- No new files unless test snapshots require expected text updates.

- [ ] **Step 1: Run full test suite**

Run:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run production build**

Run:

```bash
npm run build
```

Expected: build succeeds. Existing chunk-size warnings are acceptable if no new build error appears.

- [ ] **Step 3: Manual smoke checklist**

Run local dev server:

```bash
npm run dev -- --host 0.0.0.0
```

Smoke in browser:

1. Start a normal game.
2. Reach or seed round 15.
3. Choose 贺拔伯圭 or another external NPC.
4. Confirm 谶纬 is available.
5. Input a strong external omen:

```text
谶辞 / 征兆：白鱼入营，鳞有反文。
解释 / 指向：此乃外镇拥兵自重之兆，朝廷宜缓发军资，先查粮草账册与甲胄兵器。
```

Expected:

1. 计谋回报页 shows target NPC reply.
2. Same card shows “谶纬回响”.
3. Echo speaker is a court NPC, not the external target.
4. Echo text mentions suspicion and supply sanction.
5. Settlement shows external target loyalty lower and military power slightly lower.

- [ ] **Step 4: Inspect git state**

Run:

```bash
git status --short --branch
```

Expected: no unstaged implementation changes. Pre-existing untracked docs may remain if they were present before execution.

- [ ] **Step 5: Final commit if manual smoke required fixes**

If Step 3 required fixes, commit them:

```bash
git add <changed-files>
git commit -m "fix: stabilize omen echo flow"
```

If no fixes were needed, do not create an empty commit.

---

## Self-Review

Spec coverage:

1. 谶纬成功率脱钩信任: Task 4.
2. 新 AI 解析字段: Tasks 1 and 2.
3. 地方军头中枢猜疑与削供给链路: Tasks 5 and 10.
4. 谶纬回响 DeepSeek prompt and speaker selection: Tasks 6 and 8.
5. 目标 NPC 谶纬专属反应 prompt: Task 9.
6. 开放 3/8/15 and add 13-round 祖廷: Task 3.
7. UI display of two-layer feedback: Task 7.
8. Fallback and no-page-blocking behavior: Tasks 6 and 8.
9. Tests and build verification: Task 11.

Scope boundary:

1. This plan does not rewrite the full external-warlord three-stat design.
2. This plan does not change the one-follow-up rule.
3. This plan does not let DeepSeek directly assign numeric deltas.
