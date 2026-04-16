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
    { key: 'grain', label: '粮秣' },
    { key: 'socialOrder', label: '民生' },
    { key: 'governance', label: '统治' },
]

export function RadarChart({ data, size = 200, label }: RadarChartProps) {
    const cx = size / 2
    const cy = size / 2
    const radius = size * 0.34
    const angleStep = (2 * Math.PI) / DIM_LABELS.length
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
    const gridPolygons = gridLevels.map(level =>
        Array.from({ length: DIM_LABELS.length }, (_, index) => {
            const point = getPoint(index, level)
            return `${point.x},${point.y}`
        }).join(' '),
    )

    const dataPoints = DIM_LABELS.map((dim, index) => {
        const point = getPoint(index, data[dim.key])
        return `${point.x},${point.y}`
    }).join(' ')

    const axisLines = DIM_LABELS.map((_, index) => {
        const point = getPoint(index, 100)
        return { x1: cx, y1: cy, x2: point.x, y2: point.y }
    })

    const labelPositions = DIM_LABELS.map((dim, index) => {
        const point = getPoint(index, 118)
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

                    {gridPolygons.map((points, index) => (
                        <polygon
                            key={index}
                            points={points}
                            fill={index === 0 ? 'rgba(255,255,255,0.012)' : 'none'}
                            stroke="rgba(201, 176, 101, 0.13)"
                            strokeWidth={index === gridLevels.length - 1 ? 1 : 0.6}
                        />
                    ))}

                    {axisLines.map((line, index) => (
                        <line
                            key={index}
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

                    {DIM_LABELS.map((dim, index) => {
                        const point = getPoint(index, data[dim.key])
                        return (
                            <g key={index}>
                                <circle
                                    cx={point.x}
                                    cy={point.y}
                                    r={5}
                                    fill="rgba(13,14,23,0.92)"
                                    stroke="rgba(245,221,149,0.95)"
                                    strokeWidth={1.2}
                                />
                                <circle cx={point.x} cy={point.y} r={2.2} fill="rgba(245,221,149,0.95)" />
                            </g>
                        )
                    })}

                    <circle className="radar-center-ring" cx={cx} cy={cy} r={radius * 0.22} />
                    <circle className="radar-center-core" cx={cx} cy={cy} r={radius * 0.16} />
                    <text x={cx} y={cy + 6} textAnchor="middle" className="radar-center-score">
                        {average}
                    </text>
                </svg>

                {labelPositions.map((pos, index) => (
                    <div
                        key={index}
                        className="radar-chip"
                        style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                    >
                        <span className="radar-chip-label">{pos.label}</span>
                        <strong className="radar-chip-value">{pos.value}</strong>
                    </div>
                ))}
            </div>
        </div>
    )
}
