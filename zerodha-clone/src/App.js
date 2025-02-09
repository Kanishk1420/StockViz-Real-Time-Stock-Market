import React from 'react';
import TradingInterface from './components/TradingInterface';
import './styles/App.css';
import Navbar from './components/Navbar';

function App() {
  return (
    <div>
      <Navbar />
      <TradingInterface />
    </div>
  );
}

export default App;