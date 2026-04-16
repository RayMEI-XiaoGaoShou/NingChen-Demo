import './FirstRoundGuideModal.css'
import { createPortal } from 'react-dom'

interface FirstRoundGuideModalProps {
    title: string
    body: string[]
    onClose: () => void
}

export function FirstRoundGuideModal({ title, body, onClose }: FirstRoundGuideModalProps) {
    const modal = (
        <div className="first-round-guide-backdrop">
            <div className="gold-panel decree-panel first-round-guide-modal animate-slide-up">
                <div className="first-round-guide-header">
                    <h3 className="first-round-guide-title">{title}</h3>
                </div>

                <div className="first-round-guide-body">
                    {body.map((paragraph, index) => (
                        <div key={paragraph} className="first-round-guide-item">
                            <span className="first-round-guide-index">0{index + 1}</span>
                            <p>{paragraph}</p>
                        </div>
                    ))}
                </div>
                <button className="btn-primary first-round-guide-button" onClick={onClose}>
                    进入此页
                </button>
            </div>
        </div>
    )

    if (typeof document === 'undefined') {
        return modal
    }

    return createPortal(modal, document.body)
}
