import React, { useState, useEffect, useRef } from 'react';
import { bondsData, BASELINE_SETTLEMENT_DATE } from './data/securityMaster.js';
import { 
  solveYTMFromCleanPrice, 
  calculateRiskMetrics, 
  calculateCleanPriceFromYield, 
  generateCashFlowSchedule 
} from './utils/analyticsEngine.js';

import Sidebar from './components/Sidebar.jsx';
import DashboardGrid from './components/DashboardGrid.jsx';
import InteractiveCalculator from './components/InteractiveCalculator.jsx';
import CashFlowSchedule from './components/CashFlowSchedule.jsx';
import AnalyticsCharts from './components/AnalyticsCharts.jsx';
import EducationalExplainers from './components/EducationalExplainers.jsx';

export default function App() {
  // 1. STATE MANAGEMENT
  const [bonds, setBonds] = useState(bondsData);
  const [activeBond, setActiveBond] = useState(bondsData[0]);
  const [settlementDate, setSettlementDate] = useState(BASELINE_SETTLEMENT_DATE);
  
  // Clean Price and YTM State (synced to current selection)
  const [cleanPrice, setCleanPrice] = useState(bondsData[0].currentCleanPrice);
  const [ytm, setYtm] = useState(bondsData[0].currentYTM);
  
  // Educational Explainer State
  const [selectedMetric, setSelectedMetric] = useState(null);
  
  // Live Simulation Ticker State
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [tickerPriceChange, setTickerPriceChange] = useState(0); // percent change
  const [tickerTime, setTickerTime] = useState(new Date());

  // Ref to track price changes for live simulation without re-triggering intervals
  const cleanPriceRef = useRef(cleanPrice);
  cleanPriceRef.current = cleanPrice;

  // 2. RECUPERATE METRICS
  const getActiveMetrics = () => {
    // Generate risk metrics based on current YTM
    const risk = calculateRiskMetrics(
      ytm,
      settlementDate,
      activeBond.maturityDate,
      activeBond.issueDate,
      activeBond.coupon,
      100
    );
    
    // Generate cash flows
    const cashFlows = generateCashFlowSchedule(
      settlementDate,
      activeBond.maturityDate,
      activeBond.issueDate,
      activeBond.coupon,
      100
    );

    return {
      cleanPrice,
      ytm,
      accruedInterest: risk.accruedInterest,
      dirtyPrice: risk.dirtyPrice,
      macaulayDuration: risk.macaulayDuration,
      modifiedDuration: risk.modifiedDuration,
      convexity: risk.convexity,
      dv01: risk.dv01,
      cashFlows
    };
  };

  const activeMetrics = getActiveMetrics();

  // 3. EVENT HANDLERS
  const handleSelectBond = (bond) => {
    setActiveBond(bond);
    setCleanPrice(bond.currentCleanPrice);
    setYtm(bond.currentYTM);
    setTickerPriceChange(0);
    // If live ticker is active, keep it active but reset baseline
  };

  const handleCleanPriceChange = (newPrice) => {
    setCleanPrice(newPrice);
    // Recalculate YTM instantly
    const solvedYTM = solveYTMFromCleanPrice(
      newPrice,
      settlementDate,
      activeBond.maturityDate,
      activeBond.issueDate,
      activeBond.coupon,
      100
    );
    setYtm(solvedYTM);
  };

  const handleYieldChange = (newYield) => {
    setYtm(newYield);
    // Recalculate clean price instantly
    const price = calculateCleanPriceFromYield(
      newYield,
      settlementDate,
      activeBond.maturityDate,
      activeBond.issueDate,
      activeBond.coupon,
      100
    );
    setCleanPrice(price);
  };

  // 4. SIMULATED LIVE TICKER ENGINE
  useEffect(() => {
    let tickerInterval = null;
    if (isLiveActive) {
      tickerInterval = setInterval(() => {
        const randomPercent = (Math.random() - 0.5) * 0.0006; // +/- 3 bps clean price move
        const baselinePrice = activeBond.currentCleanPrice;
        const currentP = cleanPriceRef.current;
        
        let nextP = currentP * (1 + randomPercent);
        
        // Boundaries safeguarding
        if (nextP > baselinePrice * 1.05) nextP = baselinePrice * 1.05;
        if (nextP < baselinePrice * 0.95) nextP = baselinePrice * 0.95;

        // Calculate percent change relative to the baseline CCIL price
        const changePct = ((nextP - baselinePrice) / baselinePrice) * 100;
        
        setTickerPriceChange(changePct);
        handleCleanPriceChange(nextP);
      }, 3000);
    } else {
      setTickerPriceChange(0);
    }

    return () => {
      if (tickerInterval) clearInterval(tickerInterval);
    };
  }, [isLiveActive, activeBond]);

  // Update ticker clock
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setTickerTime(new Date());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  const formatTickerTime = (date) => {
    return date.toLocaleTimeString('en-IN', { hour12: false });
  };

  return (
    <div className="app-container">
      {/* 1. Sidebar - Navigation & Catalog */}
      <Sidebar
        bonds={bonds}
        activeBond={activeBond}
        onSelectBond={handleSelectBond}
        settlementDate={settlementDate}
      />

      {/* 2. Main Analytics Panel */}
      <main className="terminal-main-content">
        {/* Live Simulation Top Feed Banner */}
        <div className="live-feed-banner">
          <div className="banner-left">
            <span className="live-badge" style={{ backgroundColor: isLiveActive ? '#ef4444' : '#64748b' }}>
              {isLiveActive ? 'Live Market' : 'Market Closed'}
            </span>
            <span>Active Bond Feed: <strong>{activeBond.name}</strong></span>
          </div>

          <div className="banner-right">
            {isLiveActive && (
              <span className={`ticker-indicator font-mono font-bold ${tickerPriceChange >= 0 ? 'text-emerald' : 'text-red'}`}>
                {tickerPriceChange >= 0 ? '▲ +' : '▼ '}
                {tickerPriceChange.toFixed(3)}%
              </span>
            )}
            <span className="time-badge">{formatTickerTime(tickerTime)}</span>
            <button
              onClick={() => setIsLiveActive(!isLiveActive)}
              className="mode-tab font-bold"
              style={{
                borderColor: isLiveActive ? 'var(--accent-red)' : 'var(--accent-teal)',
                color: isLiveActive ? 'var(--accent-red)' : 'var(--accent-teal)',
                backgroundColor: isLiveActive ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)'
              }}
            >
              {isLiveActive ? 'Pause Ticker' : 'Simulate Live Ticker'}
            </button>
          </div>
        </div>

        {/* Core Stats Metric Cards */}
        <DashboardGrid
          activeBond={activeBond}
          metrics={activeMetrics}
          settlementDate={settlementDate}
          onSelectMetric={setSelectedMetric}
        />

        {/* Dynamic Calculator & SVG Analytics Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.35fr', gap: '20px' }}>
          <InteractiveCalculator
            activeBond={activeBond}
            metrics={activeMetrics}
            onCleanPriceChange={handleCleanPriceChange}
            onYieldChange={handleYieldChange}
          />
          <AnalyticsCharts
            activeBond={activeBond}
            metrics={activeMetrics}
            bonds={bonds}
            settlementDate={settlementDate}
          />
        </div>

        {/* Cash Flow Schedule Table */}
        <CashFlowSchedule
          activeBond={activeBond}
          metrics={activeMetrics}
          settlementDate={settlementDate}
        />
      </main>

      {/* 3. Educational drawer panel overlay */}
      <EducationalExplainers
        activeBond={activeBond}
        metrics={activeMetrics}
        selectedMetric={selectedMetric}
        onClose={() => setSelectedMetric(null)}
      />
    </div>
  );
}
