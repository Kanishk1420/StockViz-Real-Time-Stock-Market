import React from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChevronDown } from "lucide-react";

const ChartTypes = {
  LINE: { value: "line", label: "Line Chart" },
  BAR: { value: "bar", label: "Bar Chart" },
  COLORED_BAR: { value: "colored_bar", label: "Candlestick Chart" },
};

const calculateRange = (data) => {
  if (!data.length) return { min: 0, max: 100 };
  const prices = data.flatMap((d) => [d.high, d.low].filter(Boolean));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const padding = (max - min) * 0.1;
  return { min: min - padding, max: max + padding };
};

const CustomBar = (props) => {
  const { x, y, width, data, index } = props;
  if (!data || !data[index]) return null;

  const record = data[index];
  const { min, max } = calculateRange(data);
  const scale = props.height / (max - min);

  const getY = (price) => y + (max - price) * scale;

  const openY = getY(record.open);
  const closeY = getY(record.close);
  const highY = getY(record.high);
  const lowY = getY(record.low);

  const isPositive = record.close >= record.open;
  const color = isPositive ? "#26a69a" : "#ef5350";

  const bodyHeight = Math.abs(closeY - openY);
  const bodyY = Math.min(closeY, openY);

  // Minimum visible size for thin bars
  const minBarWidth = 1;
  const minBodyHeight = 1;

  return (
    <g>
      {/* Body */}
      <rect
        x={x - width / 2}
        y={bodyY}
        width={Math.max(width, minBarWidth)}
        height={Math.max(bodyHeight, minBodyHeight)}
        fill={color}
        stroke={color}
      />
      {/* Wicks */}
      <line
        x1={x}
        y1={highY}
        x2={x}
        y2={bodyY}
        stroke={color}
        strokeWidth={1}
      />
      <line
        x1={x}
        y1={bodyY + bodyHeight}
        x2={x}
        y2={lowY}
        stroke={color}
        strokeWidth={1}
      />
    </g>
  );
};

const StockChart = ({
  data,
  chartType,
  formatDate,
  formatPrice,
  formatVolume,
  CustomTooltip,
  className 
}) => {
  const { min, max } = calculateRange(data);

  const getChart = () => {
    switch (chartType) {
      case ChartTypes.COLORED_BAR.value:
        return (
          <BarChart
            data={data}
            margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
            barCategoryGap={2}
            barGap={2}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              tickFormatter={formatDate}
              minTickGap={50}
              padding={{ left: 30, right: 30 }}
            />
            <YAxis
              domain={[min, max]}
              tickFormatter={formatPrice}
              orientation="left"
              width={75}
              padding={{ top: 20, bottom: 20 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="high"
              shape={<CustomBar data={data} />}
              isAnimationActive={false}
            />
          </BarChart>
        );
      case ChartTypes.BAR.value:
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" tickFormatter={formatDate}  height={60}
               tickMargin={20}/>
            <YAxis
              domain={["auto", "auto"]}
              tickFormatter={formatPrice}
              orientation="left"
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="close"
              fill="#6366f1"
              isAnimationActive={false}
              baseValue={min}
            />
          </BarChart>
        );
      default:
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" tickFormatter={formatDate} height={60}
               tickMargin={20} />
            <YAxis domain={["auto", "auto"]} tickFormatter={formatPrice} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        );
    }
  };

  return (
    <div className={`h-96 ${className || ''}`}>
      <ResponsiveContainer width="100%" height="100%">
        {getChart()}
      </ResponsiveContainer>
    </div>
  );
};

const ChartTypeSelector = ({ chartType, onChange }) => {
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="w-full p-2 border rounded bg-white flex items-center justify-between text-sm md:text-base"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <span>
          {ChartTypes[
            Object.keys(ChartTypes).find(
              (key) => ChartTypes[key].value === chartType
            )
          ]?.label || "Line Chart"}
        </span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {showDropdown && (
        <div className="absolute left-0 mt-1 w-full md:w-36 py-1 bg-white border rounded shadow-lg z-10">
          {Object.entries(ChartTypes).map(([key, { value, label }]) => (
            <button
              key={value}
              className={`w-full px-4 py-2 text-left hover:bg-gray-100 ${
                chartType === value ? "bg-blue-50 text-blue-600" : ""
              }`}
              onClick={() => {
                onChange(value);
                setShowDropdown(false);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export { ChartTypes, StockChart, ChartTypeSelector };
