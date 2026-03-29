import './FirstRoundGuideModal.css'

interface FirstRoundGuideModalProps {
    title: string
    body: string[]
    onClose: () => void
}

export function FirstRoundGuideModal({ title, body, onClose }: FirstRoundGuideModalProps) {
    return (
        <div className="first-round-guide-backdrop">
            <div className="gold-panel first-round-guide-modal animate-slide-up">
                <h3 className="first-round-guide-title">{title}</h3>
                <div className="first-round-guide-body">
                    {body.map(paragraph => (
                        <p key={paragraph}>{paragraph}</p>
                    ))}
                </div>
                <button className="btn-primary first-round-guide-button" onClick={onClose}>
                    知道了
                </button>
            </div>
        </div>
    )
}
