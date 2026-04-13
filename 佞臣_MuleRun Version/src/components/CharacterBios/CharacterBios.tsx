import { CHARACTER_BIO_PAGES } from '../../data/prologueContent'
import { AUTO_PAGE_SCROLL_SPEEDS, useAutoPageScroll } from '../../hooks/useAutoPageScroll'
import { useGameStore } from '../../stores/gameStore'
import { NpcPortrait } from '../NpcPortrait/NpcPortrait'
import { PageUtilityActions } from '../PageUtilityActions/PageUtilityActions'
import './CharacterBios.css'

const SECOND_PANEL_INTRO = '地方军头并不只是边将。他们各自有地盘、有部曲、有算盘，也都在等朝堂给出一个更划算的未来。'

function getDisplayPages() {
    return CHARACTER_BIO_PAGES.map((page, pageIndex) => {
        if (pageIndex === 0) {
            return {
                ...page,
                title: '朝臣',
                intro: undefined,
            }
        }

        if (pageIndex === 1) {
            return {
                ...page,
                title: '地方军头',
                intro: SECOND_PANEL_INTRO,
            }
        }

        if (pageIndex === 2) {
            return {
                ...page,
                title: '你的辅弼',
                groups: page.groups.map((group, groupIndex) =>
                    groupIndex === 0
                        ? {
                            ...group,
                            title: '南朝暗庄',
                        }
                        : group,
                ),
            }
        }

        return page
    })
}

export function CharacterBios() {
    const advancePrologue = useGameStore(state => state.advancePrologue)
    const displayPages = getDisplayPages()
    useAutoPageScroll({ pixelsPerSecond: AUTO_PAGE_SCROLL_SPEEDS.characterBios })

    return (
        <div
            className="page-container character-bios-page animate-fade-in"
            data-auto-scroll-speed={AUTO_PAGE_SCROLL_SPEEDS.characterBios}
        >
            <div className="page-utility-row narrative-utility-row animate-slide-up">
                <PageUtilityActions />
            </div>

            <div className="character-bios-hero animate-slide-up">
                <h1 className="character-bios-title">北周群像</h1>
                <p className="character-bios-summary">
                    朝堂中枢争名分，地方军头算地盘，冯道之则替你看局。记住他们各自的欲望、恐惧与站位，往后每一手计谋才会真正落到痛处。
                </p>
            </div>

            <div className="character-bios-pages">
                {displayPages.map((page, pageIndex) => (
                    <section
                        key={`${pageIndex}-${page.title}`}
                        className={`glass-panel character-bios-panel animate-slide-up animate-delay-${Math.min(pageIndex + 1, 4)}`}
                    >
                        <div className="character-bios-panel-head">
                            <h2 className="character-bios-panel-title">{page.title}</h2>
                            {page.intro && <p className="character-bios-panel-intro">{page.intro}</p>}
                        </div>

                        <div className="character-bios-groups">
                            {page.groups.map(group => (
                                <div key={group.title} className="character-bios-group">
                                    <h3 className="character-bios-group-title">{group.title}</h3>
                                    <div className="character-bios-grid">
                                        {group.entries.map(entry => (
                                            <article key={entry.name} className="character-bio-card">
                                                <NpcPortrait
                                                    name={entry.name}
                                                    className="character-bio-portrait"
                                                    framed
                                                    positionY="18%"
                                                    zoom={1.18}
                                                />
                                                <div className="character-bio-body">
                                                    <div className="character-bio-header">
                                                        <span className="character-bio-name">{entry.name}</span>
                                                        <span className="character-bio-title">{entry.title}</span>
                                                    </div>
                                                    <p className="character-bio-summary">{entry.summary}</p>
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </div>

            <div className="character-bios-actions animate-slide-up animate-delay-4">
                <button className="btn-primary character-bios-button" onClick={advancePrologue}>
                    进入第一回合
                </button>
            </div>
        </div>
    )
}
