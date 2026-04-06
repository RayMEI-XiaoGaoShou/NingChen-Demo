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
                <h3 className="first-round-guide-title">{content.title}</h3>
                <div className="first-round-guide-body">
                    <p>{content.intro}</p>
                    <ol>
                        {content.steps.map(step => (
                            <li key={step}>{step}</li>
                        ))}
                    </ol>
                    <p>正例：</p>
                    <p>{content.goodExample.omen}</p>
                    <p>{content.goodExample.interpretation}</p>
                    <p>反例：</p>
                    <p>{content.badExample.omen}</p>
                    <p>{content.badExample.interpretation}</p>
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
