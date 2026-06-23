# North Zhou Transition Design

## Goal

Improve round-loop page changes with North Zhou themed transitions that hide page loading, reinforce faction identity, and keep PC interactions responsive. The work extends the existing global `SceneTransition` system rather than adding a separate transition component.

This design is scoped to PC desktop experience. Primary visual QA targets are `1920x1080` and `2048x1152`.

## Existing Baseline

The game already has a global `SceneTransitionProvider` and `SceneTransitionLayer`. Current Southern Chen transitions use a three-stage lifecycle:

1. Cover the current page.
2. Switch state while covered.
3. Reveal the next page.

That lifecycle remains the foundation for both Southern Chen and North Zhou transitions.

## Visual Direction

North Zhou transitions should feel like a hard political machine closing and releasing: black lacquer, iron, bronze seals, dark military fabric, court gates, low gold dust, ink grit, and command-table shadow. This contrasts with the softer Southern Chen cloud-and-letter language.

Three visual families are required:

1. Court Entry
   - Used by `入朝听政`.
   - Reads as palace gates opening and the player entering the court.
   - Dedicated art and dedicated long sound effect.

2. North Zhou Common
   - Used by `朝堂势力`, `地方军头`, and the first two scheme submissions.
   - Reads as black lacquer screen, military curtain, command flag, and smoke closing over the page.
   - One shared asset family, with separate variants for tuning.

3. Next Volume
   - Used by `下一卷`.
   - Reads as a chronicle or military report page turning into the next volume.
   - Dedicated art and dedicated long sound effect.

## Variants And Triggers

Extend `SceneTransitionVariant` with these North Zhou variants:

- `north-court-entry`
  - Trigger: Round start `入朝听政`.
  - State change: `ROUND_START -> COURT_OBSERVE`.
  - Visual family: Court Entry.
  - Sound: `northCourtEntry`.

- `north-gate-scope`
  - Trigger: Court overview `朝堂势力` and `地方军头` buttons.
  - State change: local `CourtView` scope from `overview` to `court` or `external`.
  - Visual family: North Zhou Common.
  - Sound: none for now, or later a short UI/action sound.

- `north-scheme-return`
  - Trigger: first and second embedded scheme `落子`.
  - State change: close composer and return to the target NPC's owner scope.
  - Visual family: North Zhou Common.
  - Sound: none for now, or later a short action sound.

- `north-next-volume`
  - Trigger: settlement `下一卷`.
  - State change: `SETTLEMENT -> ROUND_END`, entering the volume-end chronicle screen before the next round flow continues.
  - Visual family: Next Volume.
  - Sound: `northNextVolume`.

Existing Southern Chen variants remain:

- `to-empress-letter`
- `from-empress-letter`
- `to-settlement`

The third scheme submission continues to use the Southern Chen transition into the empress-letter flow.

## Motion Timing

Visual transitions should not stretch to match long audio duration.

Recommended PC timing:

- `north-court-entry`
  - Total visual time: about `1.8-2.2s`.
  - Palace gate movement should feel ceremonial but not blocking.

- `north-gate-scope`
  - Total visual time: about `1.35-1.5s`.
  - This is a frequent navigation action.

- `north-scheme-return`
  - Total visual time: about `1.35-1.5s`.
  - Slightly sharper than scope entry if needed, with a sense of a move being sealed.

- `north-next-volume`
  - Total visual time: about `1.8-2.4s`.
  - Page-turn motion can be slower than common navigation.

Each transition still has cover, hold, and reveal phases. The hold phase is also the preload window.

## Preload And Reveal Rules

Upgrade `SceneTransition` with a general preload capability shared by Southern Chen and North Zhou transitions.

The desired lifecycle:

1. On trigger, start transition and begin preload.
2. Cover current page.
3. When covered, run `onCovered`.
4. Hold for a minimum covered duration.
5. Reveal when key resources are ready or after the max wait expires.

Recommended preload timing:

- Minimum covered hold: about `220-300ms`.
- Additional max wait: about `700-900ms`.
- Failed resources do not block reveal.
- In development, failed resource paths can be logged for diagnosis.

Only preload next-page first-screen images. Do not preload every hidden asset.

Key resources by flow:

- `north-court-entry`
  - Court overview gate cards, backgrounds, and HUD art visible on first screen.

- `north-gate-scope`
  - Target scope background, foreground, and visible fullbody pool.

- `north-scheme-return`
  - Target owner scope background and its visible fullbody pool.

- Third scheme submission into `to-empress-letter`
  - Empress letter first-screen background, paper, and portrait assets.

- `from-empress-letter`
  - Scheme feedback background, active NPC fullbody, and feedback switches.

- `to-settlement`
  - Settlement first-screen background and core visible settlement art.

- `north-next-volume`
  - `RoundEnd` / chronicle first-screen shell, decree panel, and any visible volume-end art.

If no preload task is passed, the transition falls back to the current fixed timing behavior.

## Audio Rules

Two long transition sound effects are planned:

- Source import path: `C:\Users\micha\Desktop\音效\回合首页切换到 朝堂势力 x 地方军头页 上朝.mp3`
  - Project path: `NingChenv4/public/audio/sfx/transitions/north-court-entry.mp3`
  - Media key: `northCourtEntry`
  - Used only by `north-court-entry`.

- Source import path: `C:\Users\micha\Desktop\音效\回合结算页_退朝.mp3`
  - Project path: `NingChenv4/public/audio/sfx/transitions/north-next-volume.mp3`
  - Media key: `northNextVolume`
  - Used only by `north-next-volume`.

Long sound effects start at the same time as the transition. Visual page entry happens on the visual timeline; the sound effect continues after the next page appears.

BGM behavior:

- Long transition SFX is exclusive over BGM.
- BGM should pause or fade to zero while long transition SFX plays.
- The new page BGM fades in only when the long SFX ends or reaches its tail if a tail threshold is implemented.
- If the game is muted, neither BGM nor transition SFX plays.
- If the player mutes during a long transition SFX, the sound stops immediately.
- If another long transition SFX starts, stop the previous one first.

Short UI or action sounds for common transitions can be added later, but the two long SFX must not be reused for frequent scope changes or scheme returns.

## Audio Asset Organization

Future sound effects should be organized by usage, not by page.

Recommended structure:

```text
public/audio/
  bgm/
  voice/
    court_statements/
    scheme_avatar/
  sfx/
    transitions/
    ui/
    actions/
    alerts/
```

Current long transition effects belong in:

```text
public/audio/sfx/transitions/north-court-entry.mp3
public/audio/sfx/transitions/north-next-volume.mp3
```

Future examples:

- Button hover, select, confirm: `sfx/ui/`
- Seal, scheme placement, card draw, page stamp: `sfx/actions/`
- Danger, exposure, failed attempt: `sfx/alerts/`
- Page-level transitions: `sfx/transitions/`

## Transition Art Assets

Generate assets through AIART using GPT image mode.

Generation settings:

- Size: `2048x1152`.
- Mode: `gpt`.
- Candidate images are downloaded to:
  - `NingChenv4/output/aiart/north-transitions/candidates/`
- Candidate naming:
  - `court-entry-a.webp`
  - `court-entry-b.webp`
  - `north-common-a.webp`
  - `north-common-b.webp`
  - `next-volume-a.webp`
  - `next-volume-b.webp`

Process:

1. Generate two candidates for each of the three visual families.
2. Review and choose one direction per family.
3. Generate, edit, or crop final layered assets from chosen directions.
4. Put only final approved assets into:
   - `NingChenv4/public/images/ui/scene-transition/`
5. Keep rejected candidate art out of formal `mediaAssets.ts` mappings.

Layering structure:

- Back layer
  - Full-screen shadow, texture, smoke, or paper wash.

- Side or page layer
  - Main moving occluder: palace gates, screen/curtain/flag, or page edge.

- Front particulate layer
  - Dust, gold flecks, smoke, ink grit, paper fibers.

Each visual family uses the same structural layer model but different imagery.

## Implementation Boundaries

Extend the existing `SceneTransition` system:

- Add North Zhou variants to `SceneTransitionVariant`.
- Add timing entries for new variants.
- Add variant-specific CSS variables or classes for art and motion.
- Add a preload/wait option to `runSceneTransition`.
- Add a global transition active state or return value that lets triggering UI prevent duplicate actions.

Do not create a separate North Zhou transition provider or layer.

Add transition SFX through the shared media system:

- Extend media asset mapping with transition SFX keys.
- Add an exclusive transition-SFX channel in media state or `GlobalAudio`.
- Keep BGM and long transition SFX coordination centralized.

## Interaction Rules

While a transition is active:

- The current `SceneTransition` active promise prevents duplicate runs.
- Trigger buttons should be disabled or visually placed into a transitioning state.
- Duplicate transition triggers are ignored, not queued.
- The overlay already blocks pointer interaction while visible.

This is especially important for:

- `入朝听政`
- `朝堂势力`
- `地方军头`
- Embedded scheme `落子`
- `下一卷`

## Verification

Automated tests:

- `SceneTransition` covers new variants, timings, preload readiness, timeout behavior, and active-run deduplication.
- `RoundStart` uses `north-court-entry` for `入朝听政`.
- `CourtView` uses `north-gate-scope` for `朝堂势力` and `地方军头`.
- First and second embedded scheme submissions use `north-scheme-return`.
- Third scheme submission still uses `to-empress-letter`.
- `Settlement` uses `north-next-volume`.
- Southern Chen transitions still work and support preload.
- Media asset tests cover transition SFX paths.
- Global audio tests cover BGM suppression during long transition SFX.

Visual/audio QA:

- PC `1920x1080`.
- PC `2048x1152`.
- Capture or inspect:
  - `入朝听政`
  - `朝堂势力`
  - `地方军头`
  - First scheme return
  - Second scheme return
  - Third scheme to empress letter
  - Empress letter to feedback
  - Empress reply to settlement
  - `下一卷`
- Confirm that long SFX continues after the next page appears and BGM does not compete with it.

## Out Of Scope

- Mobile-specific animation tuning.
- Generating final approved art before candidate review.
- Replacing Southern Chen art language.
- Adding short UI/action SFX for common North Zhou transitions.
- Reworking broader page layouts.
