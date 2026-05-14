"use client"

import { useMemo } from "react"

interface SparklineProps {
  data: number[]
  color?: string
  width?: number
  height?: number
  glow?: boolean
}

export function Sparkline({ data, color = "var(--ch-blue)", width = 110, height = 26, glow = true }: SparklineProps) {
  const id = useMemo(() => "spk_" + Math.random().toString(36).slice(2, 8), [])

  if (!data || data.length < 2) return null

  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const stepX = width / (data.length - 1)
  const points = data.map((v, i) => {
    const x = i * stepX
    const y = height - ((v - min) / range) * (height - 4) - 2
    return [x, y]
  })
  const pathD = points.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(" ")
  const areaD = pathD + ` L ${width} ${height} L 0 ${height} Z`

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${id})`} />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={glow ? { filter: `drop-shadow(0 0 4px ${color})` } : {}}
      />
    </svg>
  )
}

interface MultiSeriesChartProps {
  series: { color: string; data: number[] }[]
  height?: number
}

export function MultiSeriesChart({ series, height = 180 }: MultiSeriesChartProps) {
  const baseId = useMemo(() => "msc_" + Math.random().toString(36).slice(2, 8), [])
  const width = 100
  const padY = 10
  const innerH = height - padY * 2
  const max = Math.max(...series.flatMap(s => s.data), 100)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
        <line key={i} x1="0" x2={width} y1={padY + p * innerH} y2={padY + p * innerH} stroke="rgba(255,255,255,0.05)" strokeWidth="0.3" />
      ))}
      {series.map((s, si) => {
        const pts = s.data.length < 2 ? [s.data[0] ?? 0, s.data[0] ?? 0] : s.data
        const stepX = width / (pts.length - 1)
        const points = pts.map((v, i) => [i * stepX, padY + (1 - v / max) * innerH])
        const path = points.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(" ")
        const area = path + ` L ${width} ${height} L 0 ${height} Z`
        const id = `${baseId}_${si}`
        const last = points[points.length - 1]
        return (
          <g key={si}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={s.color} stopOpacity="0.18" />
                <stop offset="1" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={area} fill={`url(#${id})`} />
            <path d={path} fill="none" stroke={s.color} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" style={{ filter: `drop-shadow(0 0 3px ${s.color})` }} />
            <circle cx={last[0]} cy={last[1]} r="1.8" fill={s.color} vectorEffect="non-scaling-stroke" />
          </g>
        )
      })}
    </svg>
  )
}

interface LineChartProps {
  data: number[]
  color?: string
  height?: number
}

export function LineChart({ data, color = "var(--ch-blue)", height = 170 }: LineChartProps) {
  const id = useMemo(() => "lcl_" + Math.random().toString(36).slice(2, 8), [])
  const width = 100
  const pts = data.length < 2 ? [data[0] ?? 0, data[0] ?? 0] : data
  const max = Math.max(...pts, 100)
  const min = 0
  const padY = 8
  const innerH = height - padY * 2
  const stepX = width / (pts.length - 1)
  const points = pts.map((v, i) => {
    const x = i * stepX
    const y = padY + (1 - (v - min) / (max - min)) * innerH
    return [x, y]
  })
  const path = points.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(" ")
  const area = path + ` L ${width} ${height} L 0 ${height} Z`
  const last = points[points.length - 1]

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height, display: "block" }}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.40" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((p, i) => (
        <line
          key={i}
          x1="0" x2={width}
          y1={padY + p * innerH} y2={padY + p * innerH}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="0.3"
        />
      ))}
      <path d={area} fill={`url(#${id})`} />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
      <circle cx={last[0]} cy={last[1]} r="2.4" fill={color} style={{ filter: `drop-shadow(0 0 6px ${color})` }} vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="1" fill="#fff" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
