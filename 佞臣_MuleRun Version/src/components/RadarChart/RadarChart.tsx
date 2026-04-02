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

export function RadarChart({ data, size = 200, label }: RadarChartProps) {
    const cx = size / 2
    const cy = size / 2
    const radius = size * 0.38
    const angleStep = (2 * Math.PI) / 5

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
        const point = getPoint(i, 120)
        return { ...point, label: dim.label, value: data[dim.key] }
    })

    return (
        <div className="radar-chart">
            {label && <h4 className="radar-label">{label}</h4>}
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {gridPolygons.map((points, i) => (
                    <polygon
                        key={i}
                        points={points}
                        fill="none"
                        stroke="rgba(201, 176, 101, 0.12)"
                        strokeWidth={i === gridLevels.length - 1 ? 1 : 0.5}
                    />
                ))}

                {axisLines.map((line, i) => (
                    <line
                        key={i}
                        x1={line.x1}
                        y1={line.y1}
                        x2={line.x2}
                        y2={line.y2}
                        stroke="rgba(201, 176, 101, 0.15)"
                        strokeWidth={0.5}
                    />
                ))}

                <polygon
                    points={dataPoints}
                    fill="rgba(201, 176, 101, 0.2)"
                    stroke="var(--color-accent-gold)"
                    strokeWidth={1.5}
                />

                {DIM_LABELS.map((dim, i) => {
                    const point = getPoint(i, data[dim.key])
                    return <circle key={i} cx={point.x} cy={point.y} r={3} fill="var(--color-accent-gold)" />
                })}

                {labelPositions.map((pos, i) => (
                    <text
                        key={i}
                        x={pos.x}
                        y={pos.y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="var(--color-text-secondary)"
                        fontSize="11"
                        fontFamily="var(--font-heading)"
                    >
                        {pos.label} {Math.round(pos.value)}
                    </text>
                ))}
            </svg>
        </div>
    )
}
