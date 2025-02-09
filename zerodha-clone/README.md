# StockViz - Real-Time Stock Market Visualization Platform

StockViz is a modern, responsive web application for real-time stock market data visualization and analysis. Built with React and FastAPI, it provides interactive charts and technical analysis tools for Indian stock market data.

![StockViz Demo](../Screenshot%202025-02-10%20003153.png)

## Features

### Current Features
- Real-time stock price updates via WebSocket connection
- Multiple chart types:
  - Line Chart
  - Bar Chart
  - Candlestick Chart
- Customizable time intervals (1m, 5m, 15m, 30m, 1h, 4h, 1D, 1W, 1M)
- Live market indices tracking (NIFTY 50, SENSEX)
- Responsive design for all device sizes
- Interactive tooltips with price and volume information
- Volume analysis chart
- Real-time data updates with automatic reconnection handling

### Project Workflow
The application follows a real-time data streaming architecture:

1. **Data Flow**
   - Backend fetches initial stock data from yfinance API
   - WebSocket connection established for real-time updates
   - Frontend subscribes to specific stock symbols and durations
   - Real-time price updates are pushed to connected clients

2. **Component Structure**
   - Navbar: Displays market indices (NIFTY 50, SENSEX)
   - TradingInterface: Main chart component with controls
   - ChartSelector: Manages different chart types
   - StockSelector: Company selection dropdown
   - TimeframeSelector: Duration selection (1m to 1M)

3. **Data Processing**
   - Historical data loaded on initial component mount
   - Real-time updates merged with historical data
   - Technical indicators calculated using TA-Lib
   - Automatic data caching and update intervals
   - Smart reconnection handling for WebSocket disruptions

4. **State Management**
   - React hooks for local state management
   - WebSocket state for real-time updates
   - Caching layer for performance optimization
   - Duration-based data aggregation
   - Automatic memory management for historical data

### Technical Stack
- **Frontend**: React, Tailwind CSS, Recharts
- **Backend**: FastAPI, WebSocket
- **Data Source**: yfinance
- **Technical Analysis**: TA-Lib
- **State Management**: React Hooks
- **APIs**: REST and WebSocket

## Roadmap

### Chart Enhancements
- [ ] Improve candlestick visualization for 4h and 1h timeframes
- [ ] Add new chart types:
  - [ ] Vertex Line
  - [ ] Step
  - [ ] Mountain
  - [ ] Baseline
  - [ ] Scatterplot
  - [ ] Histogram

### User Interface Improvements
- [ ] Implement sliding window duration selector
- [ ] Add chart interaction features:
  - [ ] Zoom in/out
  - [ ] Pan/Move
  - [ ] Chart download functionality
- [ ] Technical indicator dropdown menu with TA-Lib integration
- [ ] Simple Moving Average (SMA) overlay on candlestick charts
- [ ] Theme switcher (Light/Dark mode)

### Technical Analysis Tools
- [ ] Integration with more TA-Lib indicators
- [ ] Custom indicator settings
- [ ] Multiple indicator overlay support
- [ ] Save and load indicator configurations

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/stockviz.git
cd stockviz
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

3. Install backend dependencies:
```bash
cd backend
pip install -r requirements.txt
```

4. Start the backend server:
```bash
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

5. Start the frontend development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## Environment Setup

### Backend Requirements
- Python 3.8+
- FastAPI
- yfinance
- TA-Lib
- pandas
- uvicorn

### Frontend Requirements
- Node.js 14+
- React 18
- Tailwind CSS
- Recharts
- Lucide React

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [yfinance](https://github.com/ranaroussi/yfinance) for providing stock market data
- [TA-Lib](https://github.com/mrjbq7/ta-lib) for technical analysis tools
- [Recharts](https://recharts.org/) for the charting library
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [FastAPI](https://fastapi.tiangolo.com/) for the backend framework