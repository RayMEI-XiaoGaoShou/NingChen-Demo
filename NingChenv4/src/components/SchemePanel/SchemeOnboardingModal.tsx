import { useState } from 'react'
import type { OnboardingGuidePage } from '../../data/prologueContent'
import '../FirstRoundGuide/FirstRoundGuideModal.css'

interface SchemeOnboardingModalProps {
    open: boolean
    title: string
    pages: OnboardingGuidePage[]
    onClose: () => void
}

export function SchemeOnboardingModal({ open, title, pages, onClose }: SchemeOnboardingModalProps) {
    const [index, setIndex] = useState(0)

    if (!open || pages.length === 0) return null

    const page = pages[index]!

    return (
        <div className="first-round-guide-backdrop">
            <div className="gold-panel first-round-guide-modal first-round-guide-modal--guide animate-slide-up">
                {title ? (
                    <div className="first-round-guide-header">
                        <h3 className="first-round-guide-title">{title}</h3>
                    </div>
                ) : null}
                <div className="first-round-guide-body first-round-guide-body-rich first-round-guide-body-rich--guide">
                    <h4>{page.heading}</h4>
                    {page.intro ? <p>{page.intro}</p> : null}
                    <ul>
                        {page.bullets.map(item => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                </div>
                <div className="first-round-guide-actions">
                    <button
                        className="btn-primary first-round-guide-button"
                        disabled={index === 0}
                        onClick={() => setIndex(current => Math.max(0, current - 1))}
                    >
                        上一页
                    </button>
                    {index < pages.length - 1 ? (
                        <button
                            className="btn-primary first-round-guide-button"
                            onClick={() => setIndex(current => current + 1)}
                        >
                            下一页
                        </button>
                    ) : (
                        <button className="btn-primary first-round-guide-button" onClick={onClose}>
                            我知道了
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
