import { useEffect, useRef } from 'react'
import { createChart, AreaSeries } from 'lightweight-charts'

export default function PriceChart({ data = [], height = 180, positive = true, isLoading = false }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef(null)

  // Create chart once — never depends on `positive` so it doesn't destroy on color change
  useEffect(() => {
    if (!containerRef.current) return

    chartRef.current = createChart(containerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: '#8A8B9B',
        fontSize: 11,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: '#F0F1F5' },
      },
      crosshair: { mode: 0 },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      handleScroll: false,
      handleScale: false,
      width: containerRef.current.clientWidth,
      height,
    })

    seriesRef.current = chartRef.current.addSeries(AreaSeries, {
      lineColor: '#0DB37E',
      topColor: 'rgba(13, 179, 126, 0.2)',
      bottomColor: 'rgba(255,255,255,0)',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: true,
    })

    const ro = new ResizeObserver((entries) => {
      if (chartRef.current && entries[0]) {
        chartRef.current.applyOptions({ width: entries[0].contentRect.width })
      }
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      chartRef.current?.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [height])

  // Update series colors without recreating the chart
  useEffect(() => {
    if (!seriesRef.current) return
    const color = positive ? '#0DB37E' : '#E53935'
    seriesRef.current.applyOptions({
      lineColor: color,
      topColor: positive ? 'rgba(13, 179, 126, 0.2)' : 'rgba(229, 57, 53, 0.2)',
    })
  }, [positive])

  // Feed data into series
  useEffect(() => {
    if (!seriesRef.current || data.length === 0) return
    const sorted = [...data].sort((a, b) => a.time - b.time)
    const deduped = sorted.filter((item, i, arr) =>
      i === arr.length - 1 || item.time !== arr[i + 1].time
    )
    seriesRef.current.setData(deduped)
    chartRef.current?.timeScale().fitContent()
  }, [data])

  return (
    <div className="relative w-full" style={{ height }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
          <div className="flex gap-1 items-end h-8">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-gray-300 animate-pulse"
                style={{
                  height: `${40 + i * 12}%`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}
      <div ref={containerRef} style={{ height }} className="w-full" />
    </div>
  )
}
