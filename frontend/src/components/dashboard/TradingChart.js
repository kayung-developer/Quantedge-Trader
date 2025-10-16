import React, { useEffect, useRef, memo, useCallback } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';
import api from 'services/api';
import { useTheme } from 'contexts/ThemeContext';
import { useWebSocket } from 'contexts/WebSocketContext';
import toast from 'react-hot-toast';
import useSWR from 'swr';

// This function adapts chart options to the current theme
const getChartOptions = (theme) => {
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    return {
        layout: {
            background: { type: ColorType.Solid, color: 'transparent' }, // Transparent background to inherit from parent
            textColor: isDark ? '#E6EDF3' : '#1F2937',
        },
        grid: {
            vertLines: { color: isDark ? '#30363D' : '#F0F0F0' },
            horzLines: { color: isDark ? '#30363D' : '#F0F0F0' },
        },
        crosshair: {
            mode: CrosshairMode.Normal,
        },
        rightPriceScale: {
            borderColor: isDark ? '#30363D' : '#E5E7EB',
        },
        timeScale: {
            borderColor: isDark ? '#30363D' : '#E5E7EB',
            timeVisible: true,
            secondsVisible: false,
        },
        watermark: {
            color: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
            visible: true,
            text: 'QuantumEdge Trader',
            fontSize: 24,
            horzAlign: 'center',
            vertAlign: 'center',
        },
    };
};

const TradingChart = ({ symbol = 'EURUSD', timeframe = 'H1' }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);

  const { theme } = useTheme();
  const { lastMessage } = useWebSocket();

  const fetcher = useCallback((url) => api.get(url).then(res => res.data), []);
  const { data: initialData, error, isLoading } = useSWR(`/mt5/history/${symbol}?timeframe=${timeframe}&count=300`, fetcher, {
    revalidateOnFocus: false,
  });

  // Effect for chart initialization and destruction
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
        ...getChartOptions(theme),
        width: chartContainerRef.current.clientWidth,
        height: 400,
    });
    chartRef.current = chart;

    candlestickSeriesRef.current = chart.addCandlestickSeries({
      upColor: 'rgba(34, 197, 94, 0.8)', wickUpColor: 'rgba(34, 197, 94, 0.8)', borderUpColor: '#22C55E',
      downColor: 'rgba(239, 68, 68, 0.8)', wickDownColor: 'rgba(239, 68, 68, 0.8)', borderDownColor: '#EF4444',
    });

    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.resize(chartContainerRef.current.clientWidth, 400);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  // Effect for applying theme changes
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.applyOptions(getChartOptions(theme));
  }, [theme]);

  // Effect for loading initial data
  useEffect(() => {
    if (isLoading || !initialData || !candlestickSeriesRef.current) {
      return;
    }

    const candleData = initialData.map(d => ({
        time: (new Date(d.time).getTime() / 1000),
        open: d.open, high: d.high, low: d.low, close: d.close,
    }));

    candlestickSeriesRef.current.setData(candleData);
    chartRef.current.timeScale().fitContent();

  }, [isLoading, initialData]);

  // Effect for handling real-time WebSocket updates (conceptual)
  useEffect(() => {
    if (!lastMessage || !candlestickSeriesRef.current || lastMessage.type !== 'tick' || lastMessage.data.symbol !== symbol) {
        return;
    }
    // This is where you would handle a live tick from your backend
    // const tickData = lastMessage.data;
    // candlestickSeriesRef.current.update({
    //     time: new Date(tickData.time).getTime() / 1000,
    //     close: tickData.price, // Assuming your tick has a price
    // });
  }, [lastMessage, symbol]);

  if (error) {
    // --- THE DEFINITIVE FIX IS HERE ---
    // The incorrect toast.isActive check is completely removed.
    // Providing a unique 'id' to the toast function is the correct way
    // to prevent the same toast from being spammed on the screen.
    toast.error("Failed to load chart data. The MT5 server may be offline.", { id: 'chart-data-error-toast' });
    // --- END OF FIX ---

    return <div className="w-full h-[400px] flex items-center justify-center text-danger bg-danger/5 rounded-lg p-4">
        <div className="text-center">
            <h3 className="font-semibold">Chart Error</h3>
            <p className="text-sm">Could not load market data. Please ensure the backend is connected to MT5.</p>
        </div>
    </div>;
  }

  // Show a skeleton loader while SWR is fetching data for the first time
  if (isLoading) {
    return <div className="w-full h-[400px] bg-gray-200 dark:bg-dark-border/20 rounded-lg animate-pulse" />;
  }

  return (
    <div
        ref={chartContainerRef}
        className="w-full h-[400px] rounded-lg overflow-hidden bg-white dark:bg-dark-card border border-light-border dark:border-dark-border"
    />
  );
};

export default memo(TradingChart);