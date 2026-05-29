import { useEffect, useRef } from 'react'
import { createChart, AreaSeries } from 'lightweight-charts'

export default function PriceChart({ data = [], height = 180, positive = true }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef(null)

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
      crosshair: {
        mode: 0,
      },
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

    const color = positive ? '#3375BB' : '#E53935'

    seriesRef.current = chartRef.current.addSeries(AreaSeries, {
      lineColor: color,
      topColor: positive ? 'rgba(51, 117, 187, 0.2)' : 'rgba(229, 57, 53, 0.2)',
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
  }, [height, positive])

  useEffect(() => {
    if (seriesRef.current && data.length > 0) {
      // Sort ascending then deduplicate by timestamp (keep last value per second)
      const sorted = [...data].sort((a, b) => a.time - b.time)
      const deduped = sorted.filter((item, i, arr) =>
        i === arr.length - 1 || item.time !== arr[i + 1].time
      )
      seriesRef.current.setData(deduped)
      chartRef.current?.timeScale().fitContent()
    }
  }, [data])

  return <div ref={containerRef} style={{ height }} className="w-full" />
}
