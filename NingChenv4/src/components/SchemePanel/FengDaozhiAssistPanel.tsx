import type { FengDaozhiDraftResult, SchemeType } from '../../game/types'
import { SCHEME_UI_ASSETS } from '../../data/mediaAssets'

interface FengDaozhiAssistPanelProps {
    schemeType: SchemeType
    remaining: number
    total: number
    isLoading: boolean
    draftPreview: FengDaozhiDraftResult | null
    showPreview?: boolean
    onDraft: () => void
}

export function FengDaozhiAssistPanel(props: FengDaozhiAssistPanelProps) {
    const isOmen = props.schemeType === 'omen'
    const disabled = props.remaining <= 0 || props.isLoading
    const counterText = `${props.remaining}/${props.total}`
    const showPreview = props.showPreview ?? true

    return (
        <div className={`feng-assist-panel scheme-feng-assist ${disabled ? 'is-disabled' : ''}`}>
            <button
                type="button"
                className="feng-assist-trigger"
                onClick={props.onDraft}
                disabled={disabled}
                aria-label={props.isLoading ? '冯道之正在代拟' : `冯道之代拟 ${counterText}`}
            >
                <span className="feng-assist-mask" aria-hidden="true" />
                <img
                    src={SCHEME_UI_ASSETS.fengDaozhiAssistPortrait}
                    alt="冯道之画像"
                    className="feng-assist-portrait"
                    draggable={false}
                />
                <span className="feng-assist-count">
                    <span className="feng-assist-label-default">冯道之代拟</span>
                    <span className="feng-assist-label-hover">{props.isLoading ? '拟稿中' : '落笔代拟'}</span>
                    <span className="feng-assist-number">{counterText}</span>
                </span>
                <span className="feng-assist-hover-note">
                    冯道之只据你眼下已知的人物、时局与暗线落笔，不会替你看见未揭开的牌。
                </span>
            </button>

            {showPreview && props.draftPreview && (
                <div className="feng-assist-preview" data-source={props.draftPreview.source}>
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
