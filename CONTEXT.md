# NingChen Domain Language

This glossary records canonical terms for the game's court-politics settlement language. It keeps UI, narrative, and game-system discussions aligned without describing implementation details.

## Language

**本卷异动**:
The unified event stream shown during round settlement. It collects notable changes from the just-finished volume and distinguishes their sources with type labels.
_Avoid_: 特殊信息展示区, 关键变化列表 as top-level names.

**本卷异动纵向事件流**:
The interaction pattern for 本卷异动. On desktop it is a vertical event stream with a fixed visible area and internal vertical scrolling; on mobile it follows the page's natural vertical scroll.
_Avoid_: horizontal scrolling for event reading.

**本卷异动史注条目**:
The display style for one 本卷异动 entry. Each entry should read like a compact historian's annotation: a type label, an optional subtype or short title, and one or two concise narrative lines. Major events may use stronger ink, seals, or border accents; ordinary key changes stay quieter.
_Avoid_: oversized announcement cards for every event.

**本卷异动逐条事件流**:
The organisation rule for 本卷异动. Entries remain in one ordered event stream; each entry carries its own type label and optional subtype, but the stream does not add separate group headers for repeated types.
_Avoid_: splitting 本卷异动 back into multiple grouped modules.

**本卷异动去重**:
The event-stream rule that stronger event categories suppress duplicate lower-level summaries of the same underlying change.
_Avoid_: repeating the same event under both a high-impact category and 关键变化.

**本卷异动主副标签**:
The rule for one underlying event that belongs to more than one event category. Show it as one entry with the higher-impact category as the main label and the related category as a secondary label.
_Avoid_: duplicating the same underlying event as separate entries just because it touches multiple categories.

**本卷异动标签**:
The canonical event labels for the settlement event stream. Main labels are 人物命运, 军镇异动, 战役记录, 朝局动荡, 朝局反噬, 问政余波, and 关键变化. 朝局动荡 may use the sublabels 关系失衡 and 党内争端. 人物命运 may use the sublabels 身死 and 处置.
_Avoid_: 地方军头明牌, 关系链失衡, 势力裂口, 死亡/处置/倒戈 as visible event labels.

**本卷异动排序**:
The event-stream ordering rule. Sort by player-facing impact: 人物命运 first, then 军镇异动 or major 战役记录, then 朝局动荡, 朝局反噬, 问政余波, and finally 关键变化. Within the same tier, preserve settlement generation order. Ordinary campaign records that are not decisive wins, losses, or front-line phase changes may sit after court-instability events.
_Avoid_: sorting purely by internal data-source order.

**本卷异动空态**:
The historian-style note shown only when the entire settlement has no notable event-stream entries.
_Avoid_: per-category empty placeholders.

**朝局动荡**:
A settlement event category for structural court instability. It groups relationship-structure breaks and faction-internal ruptures, but does not include delayed backlash, deaths or dispositions, external warlord actions, or campaign records.
_Avoid_: 关系链失衡 and 势力裂口 as separate top-level settlement categories.

**关系失衡**:
A subtype of 朝局动荡 where an important NPC-to-NPC relationship structure has broken. It refers to relationships among NPCs, not an NPC's trust toward the player.
_Avoid_: 某人信任下降, 关系链失衡.

**党内争端**:
A subtype of 朝局动荡 where a court faction's influence, military strength, or internal stability has visibly ruptured or collapsed.
_Avoid_: 势力裂口, 后党内稳.

**朝局反噬**:
Delayed political debt created by player schemes. It may surface in a later round and should stay distinct from 朝局动荡, which describes damage already visible in the current settlement.
_Avoid_: using it as a catch-all for every negative court event.

**问政余波**:
A settlement event category for policy aftereffects created by the empress policy exchange. It appears only when the current round produced a real policy aftereffect.
_Avoid_: showing it as an empty recurring slot.

**战役记录**:
A settlement event category for campaign fallout, battle outcomes, or war-front phase changes. It belongs in 本卷异动 rather than as a separate settlement module, but it should not be confused with court instability.
_Avoid_: 大局推演 as a separate top-level settlement event module.

**南北朝通鉴编年体摘要**:
The chronicle area in round settlement. It should continue the current historian-summary writing style and sit naturally on the selected scroll material. It is a fixed-height summary area rather than an internally scrollable list; if the generated text is long, prefer concise text shaping and natural wrapping over adding a scrollbar inside the scroll.
_Avoid_: transparent CSS panels over the scroll text area, internal scrollbars inside the chronicle.

**本卷结算 HUD 状态令牌**:
The compact current-state summary shown in the settlement HUD. It shows only the post-settlement state for 南陈相对北周, 自身安危, and 南征风向 or 南征风险. These items are current-state labels, not change logs.
_Avoid_: repeating these status items in the body, showing before-after transitions in the HUD, long explanatory sentences in the HUD.

**下一卷行动**:
The single primary action that closes the settlement reading flow and advances to the next volume. It sits after the settlement content as the final action, while HUD actions remain auxiliary.
_Avoid_: placing a duplicate next-volume primary action in the HUD.

**国力五维变化明细**:
The settlement detail rows for the five national-power dimensions. Always show all five dimensions. Changed rows show icon, metric name, previous value in lighter ink, a short arrow, and the settled value in stronger ink. Steady rows show icon, metric name, and the single current value only. Do not show numeric deltas or sources here. Direction may be hinted by arrow color, but it should not imply player-good or player-bad.
_Avoid_: +/- delta text, duplicate numbers for steady rows, source explanations in the detail rows.

**国力五维雷达图**:
The settlement radar view of national power. It shows the post-settlement current five-dimension shape; the before-after story belongs to 国力五维变化明细.
_Avoid_: using double-layer radar comparisons for settlement changes.

**国力五维语汇**:
The canonical national-power dimensions used across round-start and settlement surfaces. Settlement should reuse the existing five-dimension names and icons rather than renaming them locally.
_Avoid_: settlement-only metric names for the same five dimensions.

**人物命运**:
A settlement event category for irreversible or formal changes to a character's standing. It includes death and court disposition, and may sit beside 军镇异动 when an external military figure's public action changes their political fate.
_Avoid_: 死亡 / 处置 / 倒戈 as a top-level category name.

**身死**:
A subtype of 人物命运 for player death or irreversible NPC death.
_Avoid_: using it for temporary loss of favor or ordinary political pressure.

**处置**:
A subtype of 人物命运 for formal court handling such as dismissal, being taken down, or being placed under official action, whether or not it ends in death.
_Avoid_: using it for ordinary trust loss.

**军镇异动**:
Public action or major visible movement by an external military power holder. It covers open secession, rebellion, or a rebellion being crushed; lighter loyalty, military-power, or trust shifts remain ordinary key changes with a military-town source label.
_Avoid_: 地方军头明牌 as a top-level category, 倒戈 as a formal subtype label.

**关键变化**:
The fallback settlement event category for ordinary but still notable changes not already covered by a stronger 本卷异动 category. It can include trust, favor, loyalty, military power, and minor faction-number changes.
_Avoid_: using it to duplicate 人物命运, 军镇异动, or 朝局动荡.

**关键变化入流**:
The rule that only player-relevant ordinary key changes enter 本卷异动. Candidate key changes that are small, already covered by stronger event categories, or not useful for immediate player judgement may stay out of the event stream.
_Avoid_: treating every candidate key change as a 本卷异动 entry.

## Example Dialogue

Designer: "This settlement has both a broken bond between two NPCs and a weakened court faction. Do we show two top-level modules?"

Domain expert: "No. Put both under 本卷异动 as 朝局动荡. Use the subtype labels 关系失衡 and 党内争端 so the player sees whether the instability came from an NPC relationship or a faction's internal condition."

Designer: "Should delayed suspicion from a scheme also be 朝局动荡?"

Domain expert: "No. That is 朝局反噬 because it is a future political debt, not already-visible structural instability."
