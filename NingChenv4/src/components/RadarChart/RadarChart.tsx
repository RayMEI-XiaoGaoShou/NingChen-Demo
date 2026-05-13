import { useId } from 'react'
import type { NationDimensions } from '../../game/types'
import './RadarChart.css'

interface RadarChartProps {
    data: NationDimensions
    size?: number
    label?: string
    variant?: 'default' | 'warBoard'
    tone?: 'neutral' | 'north' | 'south'
    dimensionIcons?: Partial<Record<keyof NationDimensions, string>>
}

const DIM_LABELS: { key: keyof NationDimensions; label: string }[] = [
    { key: 'finance', label: '财政' },
    { key: 'governance', label: '统治' },
    { key: 'socialOrder', label: '民生' },
    { key: 'grain', label: '粮草' },
    { key: 'military', label: '军事' },
]

const DIM_LABEL_POSITIONS = ['top', 'right', 'bottom-right', 'bottom-left', 'left'] as const

export function RadarChart({
    data,
    size = 200,
    label,
    variant = 'default',
    tone = 'neutral',
    dimensionIcons,
}: RadarChartProps) {
    const gradientId = useId().replace(/[^a-zA-Z0-9_-]/g, '')
    const cx = size / 2
    const cy = size / 2
    const radius = size * (variant === 'warBoard' ? 0.32 : 0.34)
    const angleStep = (2 * Math.PI) / DIM_LABELS.length
    const isWarBoard = variant === 'warBoard'
    const glowId = `radarGlow-${gradientId}`
    const fillId = `radarFill-${gradientId}`
    const lineId = `radarLine-${gradientId}`
    const chartClassName = [
        'radar-chart',
        isWarBoard ? 'radar-chart-war-board' : '',
        `radar-tone-${tone}`,
    ].filter(Boolean).join(' ')
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
        const point = getPoint(index, isWarBoard ? 160 : 118)
        return { ...point, label: dim.label, value: Math.round(data[dim.key]) }
    })

    const valuePositions = DIM_LABELS.map((dim, index) => {
        const angle = angleStep * index - Math.PI / 2
        const value = Math.round(data[dim.key])
        const point = getPoint(index, Math.max(12, Math.min(value, 100)))
        const anchor: 'start' | 'end' | 'middle' =
            Math.cos(angle) > 0.35 ? 'start' : Math.cos(angle) < -0.35 ? 'end' : 'middle'
        return {
            x: point.x + Math.cos(angle) * 12,
            y: point.y + Math.sin(angle) * 12,
            value,
            anchor,
        }
    })

    return (
        <div className={chartClassName} style={{ ['--radar-size' as string]: `${size}px` }}>
            {label && <h4 className="radar-label">{label}</h4>}
            <div className="radar-shell">
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="radar-svg">
                    <defs>
                        <radialGradient id={glowId} cx="50%" cy="45%" r="65%">
                            <stop offset="0%" stopColor="var(--radar-glow-core)" />
                            <stop offset="100%" stopColor="rgba(201, 176, 101, 0)" />
                        </radialGradient>
                        <radialGradient id={fillId} cx="50%" cy="50%" r="72%">
                            <stop offset="0%" stopColor="var(--radar-fill-core)" />
                            <stop offset="62%" stopColor="var(--radar-fill-mid)" />
                            <stop offset="100%" stopColor="var(--radar-fill-edge)" />
                        </radialGradient>
                        <linearGradient id={lineId} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="var(--radar-line-start)" />
                            <stop offset="100%" stopColor="var(--radar-line-end)" />
                        </linearGradient>
                    </defs>

                    <circle cx={cx} cy={cy} r={radius * 1.05} fill={`url(#${glowId})`} />

                    {gridPolygons.map((points, index) => (
                        <polygon
                            key={index}
                            className="radar-grid-polygon"
                            points={points}
                            fill={index === 0 ? 'rgba(255,255,255,0.012)' : 'none'}
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
                            className="radar-axis-line"
                            strokeWidth={0.7}
                        />
                    ))}

                    <g className="radar-data-group">
                        <polygon
                            className="radar-data-polygon"
                            points={dataPoints}
                            fill={`url(#${fillId})`}
                            stroke={`url(#${lineId})`}
                            strokeWidth={isWarBoard ? 2.2 : 1.8}
                        />
                    </g>

                    {DIM_LABELS.map((dim, index) => {
                        const point = getPoint(index, data[dim.key])
                        return (
                            <g key={index}>
                                <circle
                                    cx={point.x}
                                    cy={point.y}
                                    r={5}
                                    fill="rgba(13,14,23,0.92)"
                                    stroke="var(--radar-marker)"
                                    strokeWidth={1.2}
                                />
                                <circle cx={point.x} cy={point.y} r={2.2} fill="var(--radar-marker)" />
                            </g>
                        )
                    })}

                    {isWarBoard && valuePositions.map((pos, index) => (
                        <text
                            key={`value-${index}`}
                            x={pos.x}
                            y={pos.y + 4}
                            textAnchor={pos.anchor}
                            className="radar-point-value"
                        >
                            {pos.value}
                        </text>
                    ))}

                    <circle className="radar-center-ring" cx={cx} cy={cy} r={radius * 0.22} />
                    <circle className="radar-center-core" cx={cx} cy={cy} r={radius * 0.16} />
                    <text x={cx} y={cy + 6} textAnchor="middle" className="radar-center-score">
                        {average}
                    </text>
                </svg>

                {labelPositions.map((pos, index) => (
                    <div
                        key={index}
                        className={[
                            'radar-chip',
                            isWarBoard ? 'radar-chip-war-board' : '',
                            isWarBoard ? `radar-chip-pos-${DIM_LABEL_POSITIONS[index]}` : '',
                        ].filter(Boolean).join(' ')}
                        style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                    >
                        {dimensionIcons?.[DIM_LABELS[index].key] && (
                            <img
                                className="radar-chip-icon"
                                src={dimensionIcons[DIM_LABELS[index].key]}
                                alt=""
                                draggable={false}
                            />
                        )}
                        <span className="radar-chip-label">{pos.label}</span>
                        {!isWarBoard && <strong className="radar-chip-value">{pos.value}</strong>}
                    </div>
                ))}
            </div>
        </div>
    )
}
