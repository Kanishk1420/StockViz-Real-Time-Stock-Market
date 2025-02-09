// Navbar.js
import { useState, useEffect } from "react";
import { Bell, ChevronDown } from "lucide-react";

const Navbar = () => {
    const [marketData, setMarketData] = useState({
      nifty: { value: 0, change: 0 },
      sensex: { value: 0, change: 0 }
    });
  
    useEffect(() => {
        const fetchMarketData = async () => {
          try {
            const response = await fetch('http://localhost:8000/api/market-indices');
            const data = await response.json();
            setMarketData(data);
          } catch (err) {
            console.error('Failed to fetch market data:', err);
          }
        };
      
        fetchMarketData();
        const interval = setInterval(fetchMarketData, 30 * 60 * 1000); // 30 minutes in milliseconds
        return () => clearInterval(interval);
      }, []);
  
    const getColorClass = (change) => change >= 0 ? 'text-green-500' : 'text-red-500';
  
    return (
      <div className="flex flex-col md:flex-row justify-between items-center px-2 md:px-4 py-2 md:h-14 border-b shadow-md bg-white sticky top-0 z-50">
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 md:gap-4 w-full md:w-auto">
          <span className="font-semibold">NIFTY 50</span>
          <div className="flex items-center space-x-2">
            <span>{marketData.nifty.value.toFixed(2)}</span>
            <span className={getColorClass(marketData.nifty.change)}>
              {marketData.nifty.change > 0 ? '+' : ''}{marketData.nifty.change.toFixed(2)}%
            </span>
          </div>
          
          <span className="font-semibold">SENSEX</span>
          <div className="flex items-center space-x-2">
            <span>{marketData.sensex.value.toFixed(2)}</span>
            <span className={getColorClass(marketData.sensex.change)}>
              {marketData.sensex.change > 0 ? '+' : ''}{marketData.sensex.change.toFixed(2)}%
            </span>
          </div>
        </div>
   
        <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 md:gap-6 mt-2 md:mt-0 w-full md:w-auto">
          <a href="/dashboard" className="hover:text-blue-600 text-sm md:text-base">Dashboard</a>
          <button className="hover:text-blue-600 text-sm md:text-base">Orders</button>
          <button className="hover:text-blue-600 text-sm md:text-base">Holdings</button>
          <button className="hover:text-blue-600 text-sm md:text-base">Positions</button>
          <button className="hover:text-blue-600 text-sm md:text-base">Funds</button>
          
          <button className="hover:bg-gray-100 p-2 rounded-full transition-colors">
            <Bell className="w-4 h-4 md:w-5 md:h-5" />
          </button>
   
          <button className="flex items-center space-x-2 hover:bg-gray-100 px-3 py-1 rounded transition-colors">
            <span>KIG242</span>
            <ChevronDown className="w-3 h-3 md:w-4 md:h-4" />
          </button>
        </div>
      </div>
    );
  };

export default Navbar;
