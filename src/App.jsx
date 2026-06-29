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
  
  // Live Clock Time State
  const [tickerTime, setTickerTime] = useState(new Date());

  // Live NDS-OM file state info
  const [liveDataInfo, setLiveDataInfo] = useState(null);
  
  // Real-world G-Sec history state from SQLite
  const [activeBondHistory, setActiveBondHistory] = useState([]);

  // Fetch active bond quotes list from Express SQLite API
  const fetchBondsFromAPI = () => {
    fetch('/api/bonds')
      .then(res => {
        if (!res.ok) throw new Error('API server returned error');
        return res.json();
      })
      .then(data => {
        if (data && Array.isArray(data)) {
          const mappedBonds = data.map(b => ({
            ...b,
            currentCleanPrice: b.currentCleanPrice !== null ? b.currentCleanPrice : b.baselineCleanPrice,
            currentYTM: b.currentYTM !== null ? b.currentYTM : b.solvedYTM
          }));
          
          setBonds(mappedBonds);
          
          // Look for live pricing timing indicators
          const matchedActive = mappedBonds.find(b => b.isin === activeBond.isin);
          if (matchedActive && matchedActive.lastUpdated) {
            setLiveDataInfo({
              lastUpdated: matchedActive.lastUpdated,
              marketStatus: 'ACTIVE'
            });
          }
        }
      })
      .catch(err => {
        console.log('Error fetching from SQLite API, using EOD fallback:', err.message);
      });
  };

  useEffect(() => {
    fetchBondsFromAPI();
    const pollInterval = setInterval(fetchBondsFromAPI, 5000);
    return () => clearInterval(pollInterval);
  }, [activeBond.isin]);

  // Fetch chronological price history dynamically from Express SQLite API for the active bond
  useEffect(() => {
    if (!activeBond) return;
    fetch(`/api/bonds/${activeBond.isin}/history`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch history');
        return res.json();
      })
      .then(data => {
        if (data && Array.isArray(data)) {
          setActiveBondHistory(data);
        }
      })
      .catch(err => {
        console.log('Error fetching bond history, falling back to simulated history:', err.message);
        setActiveBondHistory(activeBond.history || []);
      });
  }, [activeBond.isin]);



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
            <span className="live-badge" style={{ 
              backgroundColor: liveDataInfo ? 'var(--accent-teal)' : '#64748b' 
            }}>
              {liveDataInfo ? 'NDS-OM Active' : 'Calibrated EOD'}
            </span>
            <span>
              {liveDataInfo ? (
                <>Live Quotes (Last Update: <strong style={{ color: 'var(--accent-teal)' }}>{new Date(liveDataInfo.lastUpdated).toLocaleTimeString('en-IN')}</strong>)</>
              ) : (
                <>Active Bond Feed: <strong>{activeBond.name}</strong></>
              )}
            </span>
          </div>

          <div className="banner-right">
            <span className="time-badge">{formatTickerTime(tickerTime)}</span>
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
            historicalData={activeBondHistory}
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
