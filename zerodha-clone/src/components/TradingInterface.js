import React, { useState, useEffect, useCallback } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { TrendingUp, TrendingDown, Loader, ChevronDown } from "lucide-react";
import { ChartTypes, StockChart, ChartTypeSelector } from "./ChartTypeSelector";

const DURATIONS = [
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "30m", value: "30m" },
  { label: "1h", value: "1h" },
  { label: "4h", value: "4h" },
  { label: "1D", value: "1d" },
  { label: "1W", value: "1w" },
  { label: "1M", value: "1mo" },
];
const CompanySelector = ({ selectedSymbol, onChange, companies }) => {
  const [showDropdown, setShowDropdown] = React.useState(false);
  const dropdownRef = React.useRef(null);
  
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedCompany = companies.find(([symbol]) => symbol === selectedSymbol)?.[1] || '';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="w-full p-2 border rounded bg-white flex items-center justify-between text-sm md:text-base"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <span>{selectedCompany}</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {showDropdown && (
        <div className="absolute left-0 mt-1 w-full py-1 bg-white border rounded shadow-lg z-10">
          {companies.map(([symbol, name]) => (
            <button
              key={symbol}
              className={`w-full px-4 py-2 text-left hover:bg-gray-100 ${
                selectedSymbol === symbol ? "bg-blue-50 text-blue-600" : ""
              }`}
              onClick={() => {
                onChange(symbol);
                setShowDropdown(false);
              }}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
const TradingView = () => {
  const [selectedSymbol, setSelectedSymbol] = useState("RELIANCE.NS");
  const [duration, setDuration] = useState("1d");
  const [chartType, setChartType] = useState(ChartTypes.LINE);
  const [companies, setCompanies] = useState([]);
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  const durationDropdownRef = React.useRef(null);
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (durationDropdownRef.current && !durationDropdownRef.current.contains(event.target)) {
        setShowDurationDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [stockData, setStockData] = useState({
    price: 0,
    change: 0,
    historical: [],
    high: 0,
    low: 0,
    volume: 0,
    lastUpdate: Date.now(),
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getDurationMilliseconds = useCallback((dur) => {
    const intervals = {
      "1m": 60 * 1000,
      "5m": 5 * 60 * 1000,
      "15m": 15 * 60 * 1000,
      "30m": 30 * 60 * 1000,
      "1h": 60 * 60 * 1000,
      "4h": 4 * 60 * 60 * 1000,
      "1d": 24 * 60 * 60 * 1000,
      "1w": 7 * 24 * 60 * 60 * 1000,
      "1mo": 30 * 24 * 60 * 60 * 1000,
    };
    return intervals[dur] || 60 * 1000;
  }, []);

  const shouldUpdateData = useCallback(
    (lastUpdate, currentDuration) => {
      const now = Date.now();
      const durationMs = getDurationMilliseconds(currentDuration);
      return now - lastUpdate >= durationMs;
    },
    [getDurationMilliseconds]
  );

  const fetchStockData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `http://localhost:8000/api/stock/${selectedSymbol}?duration=${duration}`
      );
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setStockData((prev) => ({
        ...data,
        lastUpdate: Date.now(),
      }));
    } catch (err) {
      console.error("Failed to fetch stock data:", err);
      setError("Failed to fetch stock data");
    } finally {
      setLoading(false);
    }
  }, [selectedSymbol, duration]);

  const connectWebSocket = useCallback(() => {
    const ws = new WebSocket(`ws://localhost:8000/ws/${selectedSymbol}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.duration === duration) {
        setStockData((prev) => {
          if (!shouldUpdateData(prev.lastUpdate, duration)) {
            return prev;
          }

          const lastIndex = prev.historical.length - 1;
          const newHistorical = [...prev.historical];
          const currentTime = data.lastUpdate || Date.now();

          if (
            lastIndex === -1 ||
            currentTime - newHistorical[lastIndex].time >=
              getDurationMilliseconds(duration)
          ) {
            newHistorical.push({
              time: currentTime,
              price: data.price || 0,
              volume: data.volume || 0,
            });
          } else {
            newHistorical[lastIndex] = {
              ...newHistorical[lastIndex],
              price: data.price || newHistorical[lastIndex].price,
              volume: data.volume || newHistorical[lastIndex].volume,
            };
          }

          const maxPoints =
            {
              "1m": 60,
              "5m": 60,
              "15m": 60,
              "30m": 48,
              "1h": 24,
              "4h": 24,
              "1d": 30,
              "1w": 52,
              "1mo": 12,
            }[duration] || 60;

          return {
            ...prev,
            price: data.price || prev.price,
            change: data.change || prev.change,
            high: Math.max(prev.high, data.price || 0),
            low: data.price
              ? Math.min(prev.low || data.price, data.price)
              : prev.low,
            historical: newHistorical.slice(-maxPoints),
            lastUpdate: currentTime,
          };
        });
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setError("WebSocket connection error");
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
      setTimeout(() => connectWebSocket(), 5000);
    };

    return ws;
  }, [selectedSymbol, duration, getDurationMilliseconds, shouldUpdateData]);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/stocks");
        if (!response.ok) throw new Error("Failed to fetch companies");
        const data = await response.json();
        setCompanies(data);
      } catch (err) {
        console.error("Failed to fetch companies:", err);
        setError("Failed to fetch companies");
      }
    };
    fetchCompanies();
  }, []);

  useEffect(() => {
    fetchStockData();
    const ws = connectWebSocket();
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [fetchStockData, connectWebSocket]);

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const format = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: duration === "1m" ? "2-digit" : undefined,
      month:
        duration === "1d" || duration === "1w" || duration === "1mo"
          ? "short"
          : undefined,
      day:
        duration === "1d" || duration === "1w" || duration === "1mo"
          ? "numeric"
          : undefined,
    });
    return format.format(date);
  };

  const formatPrice = (price) => {
    if (price === undefined || price === null) return "₹0.00";
    return `₹${parseFloat(price).toFixed(2)}`;
  };

  const formatVolume = (volume) => {
    if (volume === undefined || volume === null) return "0";
    if (volume >= 1e7) return `${(volume / 1e7).toFixed(2)}Cr`;
    if (volume >= 1e5) return `${(volume / 1e5).toFixed(2)}L`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(2)}K`;
    return volume.toString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border rounded shadow">
          <p className="text-gray-600">{formatDate(label)}</p>
          <p className="font-semibold">{formatPrice(payload[0].value)}</p>
          {payload[1] && (
            <p className="text-gray-600">
              Vol: {formatVolume(payload[1].value)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-2 md:p-4 bg-white rounded-lg shadow">
      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{error}</div>
      )}

      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-4 mb-4">
        <div className="w-full md:w-1/3">
          <CompanySelector 
            selectedSymbol={selectedSymbol}
            onChange={setSelectedSymbol}
            companies={companies}
          />
        </div>

        <div className="w-full md:w-1/3">
          <ChartTypeSelector chartType={chartType} onChange={setChartType} />
        </div>

        <div className="w-full md:w-1/3 relative" ref={durationDropdownRef}>
          <button
            className="w-full p-2 border rounded bg-white flex items-center justify-between text-sm md:text-base"
            onClick={() => setShowDurationDropdown(!showDurationDropdown)}
          >
            <span>
              {DURATIONS.find((d) => d.value === duration)?.label || "1D"}
            </span>
            <ChevronDown className="w-4 h-4" />
          </button>

          {showDurationDropdown && (
            <div className="absolute left-0 md:right-0 mt-1 w-full md:w-36 py-1 bg-white border rounded shadow-lg z-10">
              {DURATIONS.map(({ label, value }) => (
                <button
                  key={value}
                  className={`w-full px-4 py-2 text-left hover:bg-gray-100 ${
                    duration === value ? "bg-blue-50 text-blue-600" : ""
                  }`}
                  onClick={() => {
                    setDuration(value);
                    setShowDurationDropdown(false);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6 text-xs md:text-sm">
        <div className="p-2 bg-gray-50 rounded">
          <div className="text-gray-500">Price</div>
          <div className="font-semibold">{formatPrice(stockData.price)}</div>
        </div>
        <div className="p-2 bg-gray-50 rounded">
          <div className="text-gray-500">Change</div>
          <div
            className={`font-semibold flex items-center gap-1 ${
              stockData.change >= 0 ? "text-green-500" : "text-red-500"
            }`}
          >
            {stockData.change >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            {(stockData.change || 0).toFixed(2)}%
          </div>
        </div>
        <div className="p-2 bg-gray-50 rounded">
          <div className="text-gray-500">High</div>
          <div className="font-semibold">{formatPrice(stockData.high)}</div>
        </div>
        <div className="p-2 bg-gray-50 rounded">
          <div className="text-gray-500">Low</div>
          <div className="font-semibold">{formatPrice(stockData.low)}</div>
        </div>
      </div>

      <StockChart
        data={stockData.historical}
        chartType={chartType}
        formatDate={formatDate}
        formatPrice={formatPrice}
        formatVolume={formatVolume}
        CustomTooltip={CustomTooltip}
        className="h-48 md:h-96 mb-6 md:mb-12"
      />

      <div className="h-32 md:h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stockData.historical}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              tickFormatter={formatDate}
              height={50}
              tickMargin={20}
              // minTickGap={50}
            />
            <YAxis tickFormatter={formatVolume} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="volume" fill="#fecaca" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TradingView;
