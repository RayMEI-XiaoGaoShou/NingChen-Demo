import { useEffect, useMemo, useState } from 'react'
import {
    DOWAGER_FINAL_TIER_LABELS,
    DOWAGER_MEDIUM_LABELS,
    getDowagerCreationForRound,
    getDowagerFavorPresentation,
    getDowagerPoemContent,
    splitDowagerFreeInputTags,
    type DowagerOfferingCategory,
    type DowagerOfferingMedium,
    type DowagerOfferingRecord,
    type DowagerOfferingSelections,
    type DowagerStyleReference,
    type PendingDowagerOffering,
} from '../../game/dowagerOffering'
import { useGameStore } from '../../stores/gameStore'
import { PageUtilityActions } from '../PageUtilityActions/PageUtilityActions'
import './DowagerOffering.css'

const MEDIUM_ORDER: DowagerOfferingMedium[] = ['painting', 'music']

const DOWAGER_CREATION_ASSETS = {
    portrait: '/images/dowager-offering/dowager-portrait-v2.webp',
    scroll: '/images/dowager-offering/dowager-scroll.webp',
}

const DOWAGER_REVIEW_ASSETS = {
    background: '/images/dowager-offering/dowager-review-bg.webp',
    portrait: '/images/dowager-offering/dowager-review-portrait.webp',
}

const STYLE_DISPLAY_LABELS: Record<string, string> = {
    gongbi: '水彩工笔',
    xieyi: '水彩写意',
    ink: '抒情水墨',
}

const STYLE_DISPLAY_IMAGES: Record<string, string> = {
    gongbi: '/images/dowager-style-references/style-gongbi-watercolor.webp',
    xieyi: '/images/dowager-style-references/style-xieyi-watercolor.webp',
    ink: '/images/dowager-style-references/style-ink-wash.webp',
}

function getMediumDisplayLabel(medium: DowagerOfferingMedium): string {
    return medium === 'music' ? '谱曲' : DOWAGER_MEDIUM_LABELS[medium]
}

function getStyleDisplayLabel(styleId: string): string {
    return STYLE_DISPLAY_LABELS[styleId] ?? styleId
}

function getStyleDisplayImage(styleId: string): string {
    return STYLE_DISPLAY_IMAGES[styleId] ?? ''
}

function getReviewArtworkSrc(
    pendingDowagerOffering: PendingDowagerOffering | null,
    record: DowagerOfferingRecord | null,
    selectedStyleReference: DowagerStyleReference | null,
): string {
    if (pendingDowagerOffering?.mediaTask.resultImageSrc) {
        return pendingDowagerOffering.mediaTask.resultImageSrc
    }
    if (record?.mediaResultImageSrc) {
        return record.mediaResultImageSrc
    }
    if (selectedStyleReference) {
        return getStyleDisplayImage(selectedStyleReference.id) || selectedStyleReference.imageSrc
    }
    return pendingDowagerOffering?.mediaTask.referenceImageSrc ?? ''
}

function createEmptySelections(categories: DowagerOfferingCategory[]): DowagerOfferingSelections {
    return Object.fromEntries(
        categories.map(category => [
            category.id,
            {
                presetOptionIds: [],
                freeText: '',
            },
        ]),
    )
}

function countCategorySelection(selection: DowagerOfferingSelections[string]): number {
    return selection.presetOptionIds.length + splitDowagerFreeInputTags(selection.freeText).length
}

function hasValidSelections(categories: DowagerOfferingCategory[], selections: DowagerOfferingSelections): boolean {
    return categories.every(category => {
        const selection = selections[category.id]
        if (!selection) return false
        const count = countCategorySelection(selection)
        return count >= 1 && count <= category.maxSelections
    })
}

function formatSigned(value: number): string {
    return value > 0 ? `+${value}` : `${value}`
}

export function DowagerCreationPage() {
    const currentRound = useGameStore(state => state.currentRound)
    const dowagerFavor = useGameStore(state => state.dowagerFavor)
    const submitDowagerOffering = useGameStore(state => state.submitDowagerOffering)
    const openGameplayGuide = useGameStore(state => state.openGameplayGuide)
    const schedule = getDowagerCreationForRound(currentRound)
    const poem = getDowagerPoemContent(schedule?.poemId ?? 'xiangjianhuan_linhua')
    const [medium, setMedium] = useState<DowagerOfferingMedium | null>(null)
    const [paintingStep, setPaintingStep] = useState<'idle' | 'style' | 'compose'>('idle')
    const [selectionsByMedium, setSelectionsByMedium] = useState<Record<DowagerOfferingMedium, DowagerOfferingSelections>>(() => ({
        painting: createEmptySelections(poem.mediums.painting.categories),
        music: createEmptySelections(poem.mediums.music.categories),
    }))
    const [styleReferenceId, setStyleReferenceId] = useState<string | null>(null)
    const [showTestNotice, setShowTestNotice] = useState(currentRound === 1)

    const paintingCategories = poem.mediums.painting.categories
    const paintingSelections = selectionsByMedium.painting
    const musicCategories = poem.mediums.music.categories
    const musicSelections = selectionsByMedium.music
    const selectedStyleReference = poem.styleReferences.find(style => style.id === styleReferenceId) ?? null
    const favorPresentation = getDowagerFavorPresentation(dowagerFavor, {
        phase: 'DOWAGER_CREATION',
        round: currentRound,
    })
    const canSubmit = Boolean(schedule)
        && (
            (
                medium === 'painting'
                && paintingStep === 'compose'
                && Boolean(styleReferenceId)
                && hasValidSelections(paintingCategories, paintingSelections)
            )
            || (
                medium === 'music'
                && hasValidSelections(musicCategories, musicSelections)
            )
        )

    const updateCategory = (
        targetMedium: DowagerOfferingMedium,
        category: DowagerOfferingCategory,
        updater: (selection: DowagerOfferingSelections[string]) => DowagerOfferingSelections[string],
    ) => {
        setSelectionsByMedium(current => {
            const currentSelection = current[targetMedium][category.id] ?? { presetOptionIds: [], freeText: '' }
            return {
                ...current,
                [targetMedium]: {
                    ...current[targetMedium],
                    [category.id]: updater(currentSelection),
                },
            }
        })
    }

    const toggleOption = (
        targetMedium: DowagerOfferingMedium,
        category: DowagerOfferingCategory,
        optionId: string,
    ) => {
        updateCategory(targetMedium, category, selection => {
            const exists = selection.presetOptionIds.includes(optionId)
            if (exists) {
                return {
                    ...selection,
                    presetOptionIds: selection.presetOptionIds.filter(id => id !== optionId),
                }
            }
            if (countCategorySelection(selection) >= category.maxSelections) return selection
            return {
                ...selection,
                presetOptionIds: [...selection.presetOptionIds, optionId],
            }
        })
    }

    const updateFreeText = (
        targetMedium: DowagerOfferingMedium,
        category: DowagerOfferingCategory,
        freeText: string,
    ) => {
        updateCategory(targetMedium, category, selection => ({
            ...selection,
            freeText,
        }))
    }

    const selectMedium = (targetMedium: DowagerOfferingMedium) => {
        setMedium(targetMedium)
        if (targetMedium === 'painting') {
            setPaintingStep(styleReferenceId ? 'compose' : 'style')
            return
        }
        setPaintingStep('idle')
    }

    const selectStyleReference = (styleId: string) => {
        setMedium('painting')
        setStyleReferenceId(styleId)
        setPaintingStep('compose')
    }

    const submit = () => {
        if (!canSubmit || !medium) return
        if (medium === 'painting') {
            if (!styleReferenceId) return
            submitDowagerOffering({
                medium: 'painting',
                selections: paintingSelections,
                styleReferenceId,
            })
            return
        }

        submitDowagerOffering({
            medium: 'music',
            selections: musicSelections,
            styleReferenceId: null,
        })
    }

    const renderCategory = (
        targetMedium: DowagerOfferingMedium,
        category: DowagerOfferingCategory,
        selection: DowagerOfferingSelections[string] = { presetOptionIds: [], freeText: '' },
    ) => {
        const splitTags = splitDowagerFreeInputTags(selection.freeText)
        const selectedCount = countCategorySelection(selection)
        const overLimit = selectedCount > category.maxSelections
        return (
            <section className="dowager-category" key={category.id}>
                <header>
                    <h2>{category.label}</h2>
                    <span>{selectedCount}/{category.maxSelections}</span>
                </header>
                <div className="dowager-option-list" aria-label={`${category.label}选项区`}>
                    {category.options.map(option => {
                        const selected = selection.presetOptionIds.includes(option.id)
                        return (
                            <button
                                key={option.id}
                                type="button"
                                className={`dowager-option ${selected ? 'is-selected' : ''}`}
                                aria-pressed={selected}
                                onClick={() => toggleOption(targetMedium, category, option.id)}
                            >
                                {option.label}
                            </button>
                        )
                    })}
                </div>
                <label className="dowager-free-input-label">
                    <span>
                        自由输入
                        <span
                            className="dowager-free-help"
                            tabIndex={0}
                            title="可用全角分号 `；` 分隔多个词。每个词会作为一项参与评分，如：亭子；落花；流水。"
                        >
                            ?
                        </span>
                    </span>
                    <input
                        value={selection.freeText ?? ''}
                        onChange={event => updateFreeText(targetMedium, category, event.target.value)}
                        placeholder="亭子；落花；流水"
                    />
                </label>
                <p className={`dowager-input-hint ${overLimit ? 'is-warning' : ''}`}>
                    {splitTags.length > 0
                        ? `已拆到 ${splitTags.length} 项：${splitTags.join('、')}`
                        : '可留空，也可用全角分号补入短语。'}
                </p>
            </section>
        )
    }

    return (
        <div className="dowager-offering dowager-offering-creation page-enter">
            <div className="dowager-creation-stage">
                <div className="dowager-stage-background" aria-hidden="true" />
                <div className="dowager-creation-frame">
                    <header className="dowager-creation-hud" aria-label="太后雅好状态">
                        <h1 className="dowager-creation-title">太后雅好</h1>
                        <div className="dowager-hud-status">
                            <span>好感度</span>
                            <strong>{dowagerFavor}</strong>
                            <i aria-hidden="true" />
                            <span>个人安危</span>
                            <strong className={favorPresentation.className}>{favorPresentation.label}</strong>
                        </div>
                    </header>

                    <div className="dowager-offering-utility-row">
                        <PageUtilityActions onOpenGuide={() => openGameplayGuide('gameplay')} />
                    </div>

                    <aside className="dowager-scroll-poem" aria-label="太后题面" data-poem-title={poem.title}>
                        <img
                            className="dowager-scroll-image"
                            src={DOWAGER_CREATION_ASSETS.scroll}
                            alt=""
                            aria-hidden="true"
                            draggable={false}
                        />
                        <div className="dowager-scroll-text">
                            <h2 className="dowager-scroll-title">{poem.title.replace('·', ' ')}</h2>
                            <div className="dowager-scroll-body">
                                {poem.bodyLines.map(line => <p key={line}>{line}</p>)}
                            </div>
                        </div>
                    </aside>

                    <main className="dowager-creation-workspace" aria-label="太后献艺创作">
                        <div className="dowager-medium-actions" role="tablist" aria-label="献艺方式">
                            {MEDIUM_ORDER.map(item => (
                                <button
                                    key={item}
                                    type="button"
                                    role="tab"
                                    aria-selected={medium === item}
                                    className={`dowager-medium-button ${medium === item ? 'is-active' : ''}`}
                                    onClick={() => selectMedium(item)}
                                >
                                    {getMediumDisplayLabel(item)}
                                </button>
                            ))}
                        </div>

                        {medium === 'painting' && paintingStep === 'style' && (
                            <section className="dowager-style-selection" aria-label="画风选择">
                                {poem.styleReferences.map(style => {
                                    const displayImage = getStyleDisplayImage(style.id) || style.imageSrc
                                    return (
                                        <button
                                            key={style.id}
                                            type="button"
                                            className="dowager-style-card"
                                            onClick={() => selectStyleReference(style.id)}
                                            title={style.promptHint}
                                            data-generation-reference={style.imageSrc}
                                        >
                                            <img
                                                src={displayImage}
                                                alt={getStyleDisplayLabel(style.id)}
                                                loading="lazy"
                                                draggable={false}
                                            />
                                            <span>{getStyleDisplayLabel(style.id)}</span>
                                        </button>
                                    )
                                })}
                            </section>
                        )}

                        {medium === 'painting' && paintingStep === 'compose' && selectedStyleReference && (
                            <section className="dowager-compose-layout" aria-label="作画构思">
                                <div className="dowager-compose-left">
                                    <button
                                        type="button"
                                        className="dowager-back-style"
                                        onClick={() => setPaintingStep('style')}
                                    >
                                        返回画风选择
                                    </button>

                                    <div className="dowager-category-stack">
                                        {paintingCategories.map(category => (
                                            renderCategory('painting', category, paintingSelections[category.id])
                                        ))}
                                    </div>
                                </div>

                                <figure className="dowager-selected-style">
                                    <img
                                        src={getStyleDisplayImage(selectedStyleReference.id) || selectedStyleReference.imageSrc}
                                        alt={getStyleDisplayLabel(selectedStyleReference.id)}
                                        loading="lazy"
                                        draggable={false}
                                    />
                                    <figcaption>{getStyleDisplayLabel(selectedStyleReference.id)}</figcaption>
                                </figure>
                            </section>
                        )}

                        {medium === 'music' && (
                            <section className="dowager-music-grid" aria-label="谱曲构思">
                                {musicCategories.map(category => (
                                    renderCategory('music', category, musicSelections[category.id])
                                ))}
                            </section>
                        )}
                    </main>

                    <button
                        type="button"
                        className="dowager-submit"
                        disabled={!canSubmit}
                        onClick={submit}
                    >
                        <span className="dowager-submit-label">开始创作</span>
                    </button>
                </div>
                <div className="dowager-portrait-bleed" aria-hidden="true">
                    <div className="dowager-portrait-proxy">
                        <img
                            className="dowager-portrait"
                            src={DOWAGER_CREATION_ASSETS.portrait}
                            alt=""
                            draggable={false}
                        />
                    </div>
                </div>
            </div>

            {showTestNotice && (
                <div className="dowager-test-notice-layer" role="dialog" aria-modal="true" aria-labelledby="dowager-test-notice-title">
                    <div className="dowager-test-notice">
                        <h2 id="dowager-test-notice-title">玩法测试提示</h2>
                        <ol>
                            <li>
                                北周太后每奇数回合会写一首诗词，玩家需要围绕这首诗词作画、谱曲，画作由 Seedream 生成，音乐由 MiniMax Music 2.6 生成，会在下一回合验收；
                            </li>
                            <li>
                                该玩法正在开发，仅开放首回合作画玩法和第二回合画作验收，见谅！
                            </li>
                        </ol>
                        <button type="button" onClick={() => setShowTestNotice(false)}>
                            知道了
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export function DowagerReviewPage() {
    const currentRound = useGameStore(state => state.currentRound)
    const dowagerFavor = useGameStore(state => state.dowagerFavor)
    const pendingDowagerOffering = useGameStore(state => state.pendingDowagerOffering)
    const dowagerOfferingRecords = useGameStore(state => state.dowagerOfferingRecords)
    const resolveDowagerReview = useGameStore(state => state.resolveDowagerReview)
    const requestDowagerReviewComment = useGameStore(state => state.requestDowagerReviewComment)
    const nextPhase = useGameStore(state => state.nextPhase)
    const openGameplayGuide = useGameStore(state => state.openGameplayGuide)

    useEffect(() => {
        resolveDowagerReview()
        void requestDowagerReviewComment()
    }, [requestDowagerReviewComment, resolveDowagerReview])

    return (
        <DowagerReviewPageView
            currentRound={currentRound}
            dowagerFavor={dowagerFavor}
            pendingDowagerOffering={pendingDowagerOffering}
            dowagerOfferingRecords={dowagerOfferingRecords}
            onContinue={nextPhase}
            onOpenGuide={() => openGameplayGuide('gameplay')}
        />
    )
}

interface DowagerReviewPageViewProps {
    currentRound: number
    dowagerFavor: number
    pendingDowagerOffering: PendingDowagerOffering | null
    dowagerOfferingRecords: DowagerOfferingRecord[]
    onContinue: () => void
    onOpenGuide: () => void
}

export function DowagerReviewPageView({
    currentRound,
    dowagerFavor,
    pendingDowagerOffering,
    dowagerOfferingRecords,
    onContinue,
    onOpenGuide,
}: DowagerReviewPageViewProps) {
    const [artworkDialogOpen, setArtworkDialogOpen] = useState(false)
    const record = useMemo(() => {
        if (pendingDowagerOffering) {
            return dowagerOfferingRecords.find(item => item.id === pendingDowagerOffering.id) ?? null
        }
        return dowagerOfferingRecords.at(-1) ?? null
    }, [dowagerOfferingRecords, pendingDowagerOffering])
    const poem = getDowagerPoemContent(pendingDowagerOffering?.poemId ?? record?.poemId ?? 'xiangjianhuan_linhua')
    const activeMedium = record?.medium ?? pendingDowagerOffering?.medium ?? null
    const selectedStyleReference = activeMedium === 'painting'
        ? poem.styleReferences.find(style => style.id === (pendingDowagerOffering?.styleReferenceId ?? record?.styleReferenceId ?? null)) ?? null
        : null
    const statusText = pendingDowagerOffering?.mediaTask.displayText ?? record?.mediaDisplayText ?? '画稿未及装裱'
    const tierLabel = record ? DOWAGER_FINAL_TIER_LABELS[record.finalTier] : '待定'
    const favorDelta = record?.favorDelta ?? 0
    const favorPresentation = getDowagerFavorPresentation(dowagerFavor, {
        phase: 'DOWAGER_REVIEW',
        round: currentRound,
    })
    const isPaintingReview = activeMedium === 'painting'
    const reviewArtworkSrc = getReviewArtworkSrc(pendingDowagerOffering, record, selectedStyleReference)
    const reviewArtworkLabel = selectedStyleReference
        ? getStyleDisplayLabel(selectedStyleReference.id)
        : '画作'

    if (isPaintingReview) {
        return (
            <div className="dowager-offering dowager-offering-review dowager-offering-review-painting page-enter">
                <div className="dowager-review-stage">
                    <img
                        className="dowager-review-stage-background"
                        src={DOWAGER_REVIEW_ASSETS.background}
                        alt=""
                        aria-hidden="true"
                        draggable={false}
                    />
                    <div className="dowager-review-frame">
                        <header className="dowager-creation-hud" aria-label="太后雅好状态">
                            <h1 className="dowager-creation-title">太后雅好</h1>
                            <div className="dowager-hud-status">
                                <span>好感度</span>
                                <strong>{dowagerFavor}</strong>
                                <i aria-hidden="true" />
                                <span>个人安危</span>
                                <strong className={favorPresentation.className}>{favorPresentation.label}</strong>
                            </div>
                        </header>

                        <div className="dowager-offering-utility-row">
                            <PageUtilityActions onOpenGuide={onOpenGuide} />
                        </div>

                        <aside className="dowager-scroll-poem dowager-review-scroll-poem" aria-label="太后题面" data-poem-title={poem.title}>
                            <img
                                className="dowager-scroll-image"
                                src={DOWAGER_CREATION_ASSETS.scroll}
                                alt=""
                                aria-hidden="true"
                                draggable={false}
                            />
                            <div className="dowager-scroll-text">
                                <h2 className="dowager-scroll-title">{poem.title.replace('·', ' ')}</h2>
                                <div className="dowager-scroll-body">
                                    {poem.bodyLines.map(line => <p key={line}>{line}</p>)}
                                </div>
                            </div>
                        </aside>

                        <section className="dowager-review-artwork" aria-label="画作呈现区">
                            <button
                                type="button"
                                className="dowager-review-artwork-button"
                                aria-haspopup="dialog"
                                aria-label="放大画作"
                                onClick={() => setArtworkDialogOpen(true)}
                            >
                                {reviewArtworkSrc && (
                                    <img
                                        src={reviewArtworkSrc}
                                        alt={reviewArtworkLabel}
                                        draggable={false}
                                    />
                                )}
                                <span className="dowager-review-artwork-hint">
                                    点击可放大
                                </span>
                            </button>
                        </section>

                        {artworkDialogOpen && reviewArtworkSrc && (
                            <div
                                className="dowager-review-artwork-modal"
                                role="dialog"
                                aria-modal="true"
                                aria-label="画作放大预览"
                                onClick={() => setArtworkDialogOpen(false)}
                            >
                                <button
                                    type="button"
                                    className="dowager-review-artwork-modal-button"
                                    aria-label="缩小画作"
                                    onClick={() => setArtworkDialogOpen(false)}
                                >
                                    <img
                                        src={reviewArtworkSrc}
                                        alt={reviewArtworkLabel}
                                        draggable={false}
                                    />
                                    <span>点击可缩小</span>
                                </button>
                            </div>
                        )}

                        <section className="dowager-review-comment-panel" aria-label="太后点评">
                            <div className="dowager-review-comment-seal" aria-hidden="true">
                                太后点评
                            </div>
                            <p>{record?.dowagerComment ?? '帘内尚无回音。'}</p>
                        </section>

                        <button type="button" className="dowager-submit dowager-review-submit" onClick={onContinue}>
                            <span className="dowager-submit-label">退下候旨</span>
                        </button>
                    </div>
                    <div className="dowager-review-portrait-bleed" aria-hidden="true">
                        <div className="dowager-review-portrait-proxy">
                            <img
                                className="dowager-review-portrait"
                                src={DOWAGER_REVIEW_ASSETS.portrait}
                                alt=""
                                draggable={false}
                            />
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="dowager-offering dowager-offering-review page-enter">
            <div className="dowager-offering-bg" aria-hidden="true" />
            <div className="dowager-offering-frame">
                <div className="dowager-offering-utility-row">
                    <PageUtilityActions onOpenGuide={onOpenGuide} />
                </div>

                <aside className="dowager-poem-panel" aria-label="太后题面">
                    <span className="dowager-kicker">太后验收</span>
                    <h1>{poem.title}</h1>
                    <div className="dowager-poem-lines">
                        {poem.bodyLines.map(line => <p key={line}>{line}</p>)}
                    </div>
                </aside>

                <main className="dowager-review-board">
                    <section className="dowager-work-status">
                        <div className="dowager-work-status-copy">
                            <span>{activeMedium ? DOWAGER_MEDIUM_LABELS[activeMedium] : '献艺'}</span>
                            <h2>{statusText}</h2>
                            <p title="离开后便不再等候本次成品">离开后便不再等候本次成品</p>
                        </div>
                        {selectedStyleReference && (
                            <div className="dowager-review-style" aria-label="画风样本">
                                <img src={selectedStyleReference.imageSrc} alt="" loading="lazy" draggable={false} />
                                <span>画风样本</span>
                                <strong>{selectedStyleReference.label}</strong>
                            </div>
                        )}
                    </section>

                    <section className="dowager-review-result">
                        <div>
                            <span>验收档位</span>
                            <strong>{tierLabel}</strong>
                        </div>
                        <div>
                            <span>好感变化</span>
                            <strong>{formatSigned(favorDelta)}</strong>
                        </div>
                        <div>
                            <span>个人安危</span>
                            <strong className={favorPresentation.className}>{favorPresentation.label}</strong>
                        </div>
                    </section>

                    <blockquote className="dowager-comment">
                        {record?.dowagerComment ?? '帘内尚无回音。'}
                    </blockquote>

                    <p className="dowager-public-evidence">
                        {record?.evaluationSummaryForDowager ?? '献艺仍在整理。'}
                    </p>

                    <button type="button" className="dowager-submit" onClick={onContinue}>
                        退下候旨
                    </button>
                </main>
            </div>
        </div>
    )
}
