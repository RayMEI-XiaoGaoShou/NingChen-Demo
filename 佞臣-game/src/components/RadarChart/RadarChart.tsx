// ========================================
// 纯 SVG 五维雷达图组件
// 展示北周 finance/grain/military/socialOrder/governance
// ========================================

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
    { key: 'socialOrder', label: '社会' },
    { key: 'governance', label: '统治' },
]

export function RadarChart({ data, size = 200, label }: RadarChartProps) {
    const cx = size / 2
    const cy = size / 2
    const radius = size * 0.38
    const angleStep = (2 * Math.PI) / 5

    // 计算多边形顶点
    const getPoint = (index: number, value: number) => {
        const angle = angleStep * index - Math.PI / 2
        const r = (Math.min(value, 100) / 100) * radius
        return {
            x: cx + r * Math.cos(angle),
            y: cy + r * Math.sin(angle),
        }
    }

    // 背景网格环
    const gridLevels = [20, 40, 60, 80, 100]
    const gridPolygons = gridLevels.map(level => {
        const points = Array.from({ length: 5 }, (_, i) => {
            const p = getPoint(i, level)
            return `${p.x},${p.y}`
        })
        return points.join(' ')
    })

    // 数据多边形
    const dataPoints = DIM_LABELS.map((dim, i) => {
        const p = getPoint(i, data[dim.key])
        return `${p.x},${p.y}`
    }).join(' ')

    // 轴线
    const axisLines = DIM_LABELS.map((_, i) => {
        const p = getPoint(i, 100)
        return { x1: cx, y1: cy, x2: p.x, y2: p.y }
    })

    // 标签位置
    const labelPositions = DIM_LABELS.map((dim, i) => {
        const p = getPoint(i, 120)
        return { ...p, label: dim.label, value: data[dim.key] }
    })

    return (
        <div className="radar-chart">
            {label && <h4 className="radar-label">{label}</h4>}
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {/* 网格 */}
                {gridPolygons.map((points, i) => (
                    <polygon
                        key={i}
                        points={points}
                        fill="none"
                        stroke="rgba(201, 176, 101, 0.12)"
                        strokeWidth={i === gridLevels.length - 1 ? 1 : 0.5}
                    />
                ))}

                {/* 轴线 */}
                {axisLines.map((line, i) => (
                    <line
                        key={i}
                        x1={line.x1} y1={line.y1}
                        x2={line.x2} y2={line.y2}
                        stroke="rgba(201, 176, 101, 0.15)"
                        strokeWidth={0.5}
                    />
                ))}

                {/* 数据面 */}
                <polygon
                    points={dataPoints}
                    fill="rgba(201, 176, 101, 0.2)"
                    stroke="var(--color-accent-gold)"
                    strokeWidth={1.5}
                />

                {/* 数据点 */}
                {DIM_LABELS.map((dim, i) => {
                    const p = getPoint(i, data[dim.key])
                    return (
                        <circle key={i} cx={p.x} cy={p.y} r={3}
                            fill="var(--color-accent-gold)" />
                    )
                })}

                {/* 标签 */}
                {labelPositions.map((pos, i) => (
                    <text key={i} x={pos.x} y={pos.y}
                        textAnchor="middle" dominantBaseline="central"
                        fill="var(--color-text-secondary)"
                        fontSize="11" fontFamily="var(--font-heading)"
                    >
                        {pos.label} {Math.round(pos.value)}
                    </text>
                ))}
            </svg>
        </div>
    )
}
