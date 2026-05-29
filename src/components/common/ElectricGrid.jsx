import { motion } from 'framer-motion'

const BOLT = 80 // spark trail length in px

// Horizontal sparks: which grid row, timing, direction
const H_SPARKS = [
  { row: 0, delay: 0.0,  dur: 2.2, rev: false },
  { row: 1, delay: 1.3,  dur: 1.8, rev: true  },
  { row: 2, delay: 0.6,  dur: 2.5, rev: false },
  { row: 3, delay: 2.1,  dur: 1.9, rev: true  },
  { row: 4, delay: 1.0,  dur: 2.3, rev: false },
  { row: 5, delay: 3.2,  dur: 2.0, rev: true  },
  { row: 1, delay: 4.1,  dur: 1.6, rev: false },
  { row: 3, delay: 5.0,  dur: 2.1, rev: true  },
]

// Vertical sparks: which grid column, timing, direction
const V_SPARKS = [
  { col: 1, delay: 0.4,  dur: 1.9, rev: false },
  { col: 3, delay: 1.7,  dur: 2.2, rev: true  },
  { col: 5, delay: 2.9,  dur: 1.7, rev: false },
  { col: 7, delay: 0.8,  dur: 2.4, rev: true  },
  { col: 2, delay: 3.5,  dur: 1.8, rev: false },
  { col: 6, delay: 4.8,  dur: 2.0, rev: true  },
]

function Spark({ x1, y1, x2, y2, color, delay, dur, axis, rev, W, H }) {
  const isH = axis === 'h'
  const from = isH
    ? (rev ? W + BOLT : -BOLT)
    : (rev ? H + BOLT : -BOLT)
  const to = isH
    ? (rev ? -BOLT : W + BOLT)
    : (rev ? -BOLT : H + BOLT)

  const glowColor = color

  return (
    <motion.g
      animate={isH ? { x: [from, to] } : { y: [from, to] }}
      transition={{
        duration: dur,
        delay,
        repeat: Infinity,
        repeatDelay: dur + 1.8 + delay * 0.15,
        ease: 'linear',
      }}
    >
      {/* Dim tail */}
      <line
        x1={x1} y1={y1}
        x2={isH ? x1 + BOLT * 0.45 : x2}
        y2={isH ? y2 : y1 + BOLT * 0.45}
        stroke={glowColor}
        strokeWidth={1}
        strokeOpacity={0.3}
        strokeLinecap="round"
      />
      {/* Mid body */}
      <line
        x1={isH ? x1 + BOLT * 0.25 : x2}
        y1={isH ? y1 : y1 + BOLT * 0.25}
        x2={isH ? x1 + BOLT * 0.82 : x2}
        y2={isH ? y2 : y1 + BOLT * 0.82}
        stroke={glowColor}
        strokeWidth={1.5}
        strokeOpacity={0.75}
        strokeLinecap="round"
      />
      {/* Bright tip line */}
      <line
        x1={isH ? x1 + BOLT * 0.65 : x2}
        y1={isH ? y1 : y1 + BOLT * 0.65}
        x2={isH ? x1 + BOLT : x2}
        y2={isH ? y2 : y1 + BOLT}
        stroke="#fff"
        strokeWidth={2.5}
        strokeOpacity={0.95}
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 5px ${glowColor}) drop-shadow(0 0 2px #fff)` }}
      />
      {/* Glowing tip dot */}
      <circle
        cx={isH ? x1 + BOLT : x2}
        cy={isH ? y1 : y1 + BOLT}
        r={2.8}
        fill="#fff"
        fillOpacity={1}
        style={{ filter: `drop-shadow(0 0 8px ${glowColor}) drop-shadow(0 0 4px #fff)` }}
      />
    </motion.g>
  )
}

export default function ElectricGrid({
  cols = 8,
  rows = 5,
  cell = 52,
  color = '#60AAFF',
  className = '',
}) {
  const W = cols * cell
  const H = rows * cell
  const hLines = Array.from({ length: rows + 1 }, (_, i) => i * cell)
  const vLines = Array.from({ length: cols + 1 }, (_, i) => i * cell)

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none select-none ${className}`}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Grid lines */}
        {hLines.map((y) => (
          <line
            key={`hl-${y}`}
            x1={0} y1={y} x2={W} y2={y}
            stroke={color}
            strokeWidth={0.5}
            strokeOpacity={0.2}
          />
        ))}
        {vLines.map((x) => (
          <line
            key={`vl-${x}`}
            x1={x} y1={0} x2={x} y2={H}
            stroke={color}
            strokeWidth={0.5}
            strokeOpacity={0.2}
          />
        ))}

        {/* Intersection dots */}
        {hLines.flatMap((y) =>
          vLines.map((x) => (
            <circle
              key={`dot-${x}-${y}`}
              cx={x} cy={y} r={1.5}
              fill={color}
              fillOpacity={0.28}
            />
          ))
        )}

        {/* Horizontal sparks */}
        {H_SPARKS.map(({ row, delay, dur, rev }, i) => {
          const y = hLines[row % hLines.length]
          return (
            <Spark
              key={`hs-${i}`}
              x1={0} y1={y} x2={0} y2={y}
              color={color}
              delay={delay}
              dur={dur}
              axis="h"
              rev={rev}
              W={W}
              H={H}
            />
          )
        })}

        {/* Vertical sparks */}
        {V_SPARKS.map(({ col, delay, dur, rev }, i) => {
          const x = vLines[col % vLines.length]
          return (
            <Spark
              key={`vs-${i}`}
              x1={x} y1={0} x2={x} y2={0}
              color={color}
              delay={delay}
              dur={dur}
              axis="v"
              rev={rev}
              W={W}
              H={H}
            />
          )
        })}
      </svg>
    </div>
  )
}
