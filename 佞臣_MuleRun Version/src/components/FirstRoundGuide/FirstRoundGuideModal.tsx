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
                    <span className="page-eyebrow">首局引导</span>
                    <h3 className="first-round-guide-title">{title}</h3>
                    <p className="first-round-guide-lead">这一页不用全懂，只要先抓住眼前最重要的判断点。</p>
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
