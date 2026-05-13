import type { FIRST_OMEN_TEACHING_CONTENT } from '../../data/prologueContent'
import '../FirstRoundGuide/FirstRoundGuideModal.css'

interface OmenTeachingModalProps {
    open: boolean
    content: typeof FIRST_OMEN_TEACHING_CONTENT
    onClose: () => void
}

export function OmenTeachingModal({ open, content, onClose }: OmenTeachingModalProps) {
    if (!open) return null

    return (
        <div className="first-round-guide-backdrop">
            <div className="gold-panel first-round-guide-modal animate-slide-up">
                <div className="first-round-guide-header">
                    <h3 className="first-round-guide-title">{content.title}</h3>
                </div>
                <div className="first-round-guide-body first-round-guide-body-rich">
                    <p>{content.intro}</p>
                    <ol>
                        {content.steps.map(step => (
                            <li key={step}>{step}</li>
                        ))}
                    </ol>

                    <div className="omen-teaching-section">
                        <h4>更适合谁</h4>
                        <ul>
                            {content.audienceHints.map(hint => (
                                <li key={hint}>{hint}</li>
                            ))}
                        </ul>
                    </div>

                    <div className="omen-teaching-section">
                        <h4>正例</h4>
                        <p>{content.goodExample.omen}</p>
                        <p>{content.goodExample.interpretation}</p>
                    </div>

                    <div className="omen-teaching-section">
                        <h4>反例</h4>
                        <p>{content.badExample.omen}</p>
                        <p>{content.badExample.interpretation}</p>
                        <p>{content.badExampleWhy}</p>
                    </div>

                    <ul>
                        {content.impactNotes.map(note => (
                            <li key={note}>{note}</li>
                        ))}
                    </ul>
                </div>
                <button className="btn-primary first-round-guide-button" onClick={onClose}>
                    我知道了
                </button>
            </div>
        </div>
    )
}
