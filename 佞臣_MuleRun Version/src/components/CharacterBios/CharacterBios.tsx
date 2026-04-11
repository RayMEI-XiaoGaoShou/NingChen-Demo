import { CHARACTER_BIO_PAGES } from '../../data/prologueContent'
import { useGameStore } from '../../stores/gameStore'
import { NpcPortrait } from '../NpcPortrait/NpcPortrait'
import './CharacterBios.css'

export function CharacterBios() {
    const advancePrologue = useGameStore(state => state.advancePrologue)

    return (
        <div className="page-container character-bios-page animate-fade-in">
            <div className="character-bios-hero animate-slide-up">
                <span className="character-bios-kicker">北周群像</span>
                <h1 className="character-bios-title">先认清这盘局里的人</h1>
                <p className="character-bios-summary">
                    朝堂中枢争名分，地方军头算地盘，冯道之则替你看局。记住他们各自的欲望、恐惧与站位，往后每一手计谋才会真正落到痛处。
                </p>
            </div>

            <div className="character-bios-pages">
                {CHARACTER_BIO_PAGES.map((page, pageIndex) => (
                    <section
                        key={page.title}
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
