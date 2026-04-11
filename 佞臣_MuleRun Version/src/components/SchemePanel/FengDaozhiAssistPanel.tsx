import type { FengDaozhiDraftResult, SchemeType } from '../../game/types'

interface FengDaozhiAssistPanelProps {
    schemeType: SchemeType
    remaining: number
    isLoading: boolean
    draftPreview: FengDaozhiDraftResult | null
    onDraft: () => void
}

export function FengDaozhiAssistPanel(props: FengDaozhiAssistPanelProps) {
    const isOmen = props.schemeType === 'omen'
    const disabled = props.remaining <= 0 || props.isLoading

    return (
        <div className="feng-assist-panel">
            <div className="feng-assist-header">
                <div>
                    <div className="feng-assist-title">让冯道之帮你谋划</div>
                    <div className="feng-assist-meta">本回合剩余 {props.remaining} 次</div>
                </div>
                <button
                    className="btn-utility-secondary feng-assist-button"
                    onClick={props.onDraft}
                    disabled={disabled}
                >
                    {props.isLoading ? '谋划中…' : `请他代拟（${props.remaining}）`}
                </button>
            </div>

            <p className="feng-assist-tip">
                冯道之只会依据你眼下已知的时局、人物与暗线给出一手参考，不会替你看见未揭开的牌。
            </p>

            {props.draftPreview && (
                <div className="feng-assist-preview">
                    <div className="feng-assist-preview-label">
                        冯道之密札
                        <span className="feng-assist-preview-source">
                            {props.draftPreview.source === 'ai' ? 'AI 代拟' : '本地兜底'}
                        </span>
                    </div>
                    <div className="feng-assist-preview-body">
                        <p>{props.draftPreview.primaryText}</p>
                        {isOmen && props.draftPreview.secondaryText && <p>{props.draftPreview.secondaryText}</p>}
                        {props.draftPreview.reasoning && (
                            <p className="feng-assist-reasoning">{props.draftPreview.reasoning}</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
