import type { NationDimensions } from '../../game/types'
import './RadarChart.css'

interface RadarChartProps {
    data: NationDimensions
    size?: number
    label?: string
}

const DIM_LABELS: { key: keyof NationDimensions; label: string }[] = [
    { key: 'finance', label: '财政' },
    { key: 'military', label: '军事' },
    { key: 'grain', label: '粮赋' },
    { key: 'socialOrder', label: '民生' },
    { key: 'governance', label: '统治' },
]

function getRadarTone(score: number): string {
    if (score >= 75) return '鼎盛'
    if (score >= 60) return '可战'
    if (score >= 45) return '持平'
    return '吃紧'
}

export function RadarChart({ data, size = 200, label }: RadarChartProps) {
    const cx = size / 2
    const cy = size / 2
    const radius = size * 0.34
    const angleStep = (2 * Math.PI) / 5
    const average = Math.round(
        (data.finance + data.military + data.grain + data.socialOrder + data.governance) / DIM_LABELS.length,
    )

    const getPoint = (index: number, value: number) => {
        const angle = angleStep * index - Math.PI / 2
        const r = (Math.min(value, 100) / 100) * radius
        return {
            x: cx + r * Math.cos(angle),
            y: cy + r * Math.sin(angle),
        }
    }

    const gridLevels = [20, 40, 60, 80, 100]
    const gridPolygons = gridLevels.map(level => {
        const points = Array.from({ length: 5 }, (_, i) => {
            const point = getPoint(i, level)
            return `${point.x},${point.y}`
        })

        return points.join(' ')
    })

    const dataPoints = DIM_LABELS.map((dim, i) => {
        const point = getPoint(i, data[dim.key])
        return `${point.x},${point.y}`
    }).join(' ')

    const axisLines = DIM_LABELS.map((_, i) => {
        const point = getPoint(i, 100)
        return { x1: cx, y1: cy, x2: point.x, y2: point.y }
    })

    const labelPositions = DIM_LABELS.map((dim, i) => {
        const point = getPoint(i, 118)
        return { ...point, label: dim.label, value: Math.round(data[dim.key]) }
    })

    return (
        <div className="radar-chart" style={{ ['--radar-size' as string]: `${size}px` }}>
            {label && <h4 className="radar-label">{label}</h4>}
            <div className="radar-shell">
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="radar-svg">
                    <defs>
                        <radialGradient id="radarGlow" cx="50%" cy="45%" r="65%">
                            <stop offset="0%" stopColor="rgba(201, 176, 101, 0.18)" />
                            <stop offset="100%" stopColor="rgba(201, 176, 101, 0)" />
                        </radialGradient>
                        <linearGradient id="radarLine" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="rgba(245, 221, 149, 0.95)" />
                            <stop offset="100%" stopColor="rgba(201, 176, 101, 0.78)" />
                        </linearGradient>
                    </defs>

                    <circle cx={cx} cy={cy} r={radius * 1.05} fill="url(#radarGlow)" />

                    {gridPolygons.map((points, i) => (
                        <polygon
                            key={i}
                            points={points}
                            fill={i === 0 ? 'rgba(255,255,255,0.012)' : 'none'}
                            stroke="rgba(201, 176, 101, 0.13)"
                            strokeWidth={i === gridLevels.length - 1 ? 1 : 0.6}
                        />
                    ))}

                    {axisLines.map((line, i) => (
                        <line
                            key={i}
                            x1={line.x1}
                            y1={line.y1}
                            x2={line.x2}
                            y2={line.y2}
                            stroke="rgba(201, 176, 101, 0.16)"
                            strokeWidth={0.7}
                        />
                    ))}

                    <polygon
                        points={dataPoints}
                        fill="rgba(201, 176, 101, 0.22)"
                        stroke="url(#radarLine)"
                        strokeWidth={1.8}
                    />

                    {DIM_LABELS.map((dim, i) => {
                        const point = getPoint(i, data[dim.key])
                        return (
                            <g key={i}>
                                <circle cx={point.x} cy={point.y} r={5} fill="rgba(13,14,23,0.92)" stroke="rgba(245,221,149,0.95)" strokeWidth={1.2} />
                                <circle cx={point.x} cy={point.y} r={2.2} fill="rgba(245,221,149,0.95)" />
                            </g>
                        )
                    })}

                    <circle className="radar-center-ring" cx={cx} cy={cy} r={radius * 0.18} />
                    <text x={cx} y={cy - 4} textAnchor="middle" className="radar-center-score">
                        {average}
                    </text>
                    <text x={cx} y={cy + 14} textAnchor="middle" className="radar-center-label">
                        国势
                    </text>
                </svg>

                {labelPositions.map((pos, i) => (
                    <div
                        key={i}
                        className="radar-chip"
                        style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                    >
                        <span className="radar-chip-label">{pos.label}</span>
                        <strong className="radar-chip-value">{pos.value}</strong>
                    </div>
                ))}
            </div>

            <div className="radar-footer">
                <span className="radar-tone">{getRadarTone(average)}</span>
                <span className="radar-average">五维均势 {average}</span>
            </div>
        </div>
    )
}
