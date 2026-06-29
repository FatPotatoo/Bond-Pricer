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
import AuthModal from './components/AuthModal.jsx';
import PortfolioView from './components/PortfolioView.jsx';

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

  // Auth & Portfolio State
  const [token, setToken] = useState(localStorage.getItem('bondiq_token') || null);
  const [username, setUsername] = useState(localStorage.getItem('bondiq_username') || null);
  const [portfolioData, setPortfolioData] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentTab, setCurrentTab] = useState('analytics'); // analytics, portfolio

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

  const fetchPortfolio = (currentToken = token) => {
    if (!currentToken) {
      setPortfolioData(null);
      return;
    }
    
    fetch('/api/portfolio', {
      headers: {
        'Authorization': `Bearer ${currentToken}`
      }
    })
      .then(res => {
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            handleLogout();
          }
          throw new Error('Failed to fetch portfolio');
        }
        return res.json();
      })
      .then(data => {
        setPortfolioData(data);
      })
      .catch(err => {
        console.log('Error fetching portfolio:', err.message);
      });
  };

  const handleAuthSuccess = (newToken, newUsername) => {
    localStorage.setItem('bondiq_token', newToken);
    localStorage.setItem('bondiq_username', newUsername);
    setToken(newToken);
    setUsername(newUsername);
    fetchPortfolio(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('bondiq_token');
    localStorage.removeItem('bondiq_username');
    setToken(null);
    setUsername(null);
    setPortfolioData(null);
    setCurrentTab('analytics');
  };

  useEffect(() => {
    fetchBondsFromAPI();
    if (token) fetchPortfolio();
    
    const pollInterval = setInterval(() => {
      fetchBondsFromAPI();
      if (token) fetchPortfolio();
    }, 5000);
    
    return () => clearInterval(pollInterval);
  }, [activeBond.isin, token]);

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
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        liveDataInfo={liveDataInfo}
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

          <div className="banner-right" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            {username ? (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span className="font-mono" style={{ fontSize: '12px', color: 'var(--accent-teal)', fontWeight: 'bold' }}>
                  👤 {username.toUpperCase()}
                </span>
                <button
                  onClick={handleLogout}
                  className="mode-tab font-bold"
                  style={{
                    borderColor: 'var(--accent-red)',
                    color: 'var(--accent-red)',
                    backgroundColor: 'rgba(239, 68, 68, 0.05)',
                    padding: '3px 10px',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  LOGOUT
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="mode-tab font-bold"
                style={{
                  borderColor: 'var(--accent-teal)',
                  color: 'var(--accent-teal)',
                  backgroundColor: 'rgba(20, 184, 166, 0.05)',
                  padding: '3px 10px',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                SIGN IN / REGISTER
              </button>
            )}
            <span className="time-badge">{formatTickerTime(tickerTime)}</span>
          </div>
        </div>

        {currentTab === 'portfolio' ? (
          <PortfolioView portfolioData={portfolioData} />
        ) : (
          <>
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
          </>
        )}
      </main>

      {/* 3. Educational drawer panel overlay */}
      <EducationalExplainers
        activeBond={activeBond}
        metrics={activeMetrics}
        selectedMetric={selectedMetric}
        onClose={() => setSelectedMetric(null)}
      />

      {/* 4. Authentication Modal Overlay */}
      {showAuthModal && (
        <AuthModal
          onAuthSuccess={handleAuthSuccess}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
}
