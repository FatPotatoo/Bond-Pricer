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
import TradingPanel from './components/TradingPanel.jsx';
import MarketplaceBoard from './components/MarketplaceBoard.jsx';

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
  const [ordersData, setOrdersData] = useState({ pending: [], history: [] });
  const [marketOrders, setMarketOrders] = useState([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentTab, setCurrentTab] = useState('analytics'); // analytics, quoting, portfolio

  // Live NDS-OM file state info
  const [liveDataInfo, setLiveDataInfo] = useState(null);
  
  // Real-world G-Sec history state from SQLite
  const [activeBondHistory, setActiveBondHistory] = useState([]);

  // Fetch active bond quotes list from Express SQLite API
  const fetchBondsFromAPI = (currentActiveIsin = activeBond.isin) => {
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
          
          // Sync active bond clean price & YTM with live API data
          const matchedActive = mappedBonds.find(b => b.isin === currentActiveIsin);
          if (matchedActive) {
            setActiveBond(matchedActive);
            setCleanPrice(matchedActive.currentCleanPrice);
            setYtm(matchedActive.currentYTM);
            
            if (matchedActive.lastUpdated) {
              setLiveDataInfo({
                lastUpdated: matchedActive.lastUpdated,
                marketStatus: 'ACTIVE'
              });
            }
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
          if (res.status === 401 || res.status === 403 || res.status === 404) {
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

  const fetchOrders = (currentToken = token) => {
    if (!currentToken) {
      setOrdersData({ pending: [], history: [] });
      return;
    }
    
    fetch('/api/orders', {
      headers: {
        'Authorization': `Bearer ${currentToken}`
      }
    })
      .then(res => {
        if (!res.ok) {
          if (res.status === 401 || res.status === 403 || res.status === 404) {
            handleLogout();
          }
          throw new Error('Failed to fetch orders');
        }
        return res.json();
      })
      .then(data => {
        setOrdersData(data);
      })
      .catch(err => {
        console.log('Error fetching orders:', err.message);
      });
  };

  const fetchMarketOrders = (currentToken = token) => {
    if (!currentToken) {
      setMarketOrders([]);
      return;
    }
    
    fetch('/api/market/orders', {
      headers: {
        'Authorization': `Bearer ${currentToken}`
      }
    })
      .then(res => {
        if (!res.ok) {
          if (res.status === 401 || res.status === 403 || res.status === 404) {
            handleLogout();
          }
          throw new Error('Failed to fetch market listings');
        }
        return res.json();
      })
      .then(data => {
        setMarketOrders(data);
      })
      .catch(err => {
        console.log('Error fetching market orders:', err.message);
      });
  };

  const handleCancelOrder = async (orderId) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel order');
      fetchPortfolio();
      fetchOrders();
      fetchMarketOrders();
    } catch (err) {
      console.error('Cancel order error:', err.message);
    }
  };

  const handleAuthSuccess = (newToken, newUsername) => {
    localStorage.setItem('bondiq_token', newToken);
    localStorage.setItem('bondiq_username', newUsername);
    setToken(newToken);
    setUsername(newUsername);
    fetchPortfolio(newToken);
    fetchOrders(newToken);
    fetchMarketOrders(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('bondiq_token');
    localStorage.removeItem('bondiq_username');
    setToken(null);
    setUsername(null);
    setPortfolioData(null);
    setOrdersData({ pending: [], history: [] });
    setMarketOrders([]);
    setCurrentTab('analytics');
  };

  useEffect(() => {
    fetchBondsFromAPI();
    if (token) {
      fetchPortfolio();
      fetchOrders();
      fetchMarketOrders();
    }
    
    const pollInterval = setInterval(() => {
      fetchBondsFromAPI();
      if (token) {
        fetchPortfolio();
        fetchOrders();
        fetchMarketOrders();
      }
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
        liveDataInfo={liveDataInfo}
      />

      {/* 2. Main Analytics Panel */}
      <main className="terminal-main-content">
        {/* Horizontal Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: '15px',
          borderBottom: '1px solid #1e293b',
          marginBottom: '15px',
          paddingBottom: '2px',
          alignItems: 'center'
        }} className="font-mono">
          <button
            onClick={() => setCurrentTab('analytics')}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: '2px solid',
              borderBottomColor: currentTab === 'analytics' ? 'var(--accent-teal)' : 'transparent',
              color: currentTab === 'analytics' ? 'var(--accent-teal)' : 'var(--text-muted)',
              padding: '10px 12px',
              fontSize: '12px',
              fontWeight: 'bold',
              letterSpacing: '0.5px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            MARKET WATCH
          </button>
          <button
            onClick={() => setCurrentTab('quoting')}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: '2px solid',
              borderBottomColor: currentTab === 'quoting' ? 'var(--accent-teal)' : 'transparent',
              color: currentTab === 'quoting' ? 'var(--accent-teal)' : 'var(--text-muted)',
              padding: '10px 12px',
              fontSize: '12px',
              fontWeight: 'bold',
              letterSpacing: '0.5px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            SUBMIT QUOTE
          </button>
          <button
            onClick={() => setCurrentTab('marketplace')}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: '2px solid',
              borderBottomColor: currentTab === 'marketplace' ? 'var(--accent-teal)' : 'transparent',
              color: currentTab === 'marketplace' ? 'var(--accent-teal)' : 'var(--text-muted)',
              padding: '10px 12px',
              fontSize: '12px',
              fontWeight: 'bold',
              letterSpacing: '0.5px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            MARKETPLACE
          </button>
          <button
            onClick={() => setCurrentTab('portfolio')}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: '2px solid',
              borderBottomColor: currentTab === 'portfolio' ? 'var(--accent-teal)' : 'transparent',
              color: currentTab === 'portfolio' ? 'var(--accent-teal)' : 'var(--text-muted)',
              padding: '10px 12px',
              fontSize: '12px',
              fontWeight: 'bold',
              letterSpacing: '0.5px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            PORTFOLIO
          </button>
        </div>

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

        {currentTab === 'quoting' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <TradingPanel
              activeBond={activeBond}
              token={token}
              userCash={portfolioData ? portfolioData.cashBalance : 10000000.0}
              onOrderPlaced={() => {
                fetchPortfolio();
                fetchOrders();
                fetchMarketOrders();
              }}
            />
            
            <div className="terminal-card" style={{ padding: '20px', backgroundColor: '#0a0f1d', border: '1px solid #1e293b', borderRadius: '12px' }}>
              <div style={{ fontSize: '12px', color: '#f8fafc', letterSpacing: '1px', fontWeight: 'bold', marginBottom: '15px' }} className="font-mono">
                ★ ACTIVE BOND DETAILS (CCIL REFERENCE)
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ borderBottom: '1px solid #1e293b', paddingBottom: '12px' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent-teal)' }}>{activeBond.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }} className="font-mono">{activeBond.isin}</div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }} className="font-mono">
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>COUPON RATE</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#f8fafc' }}>{(activeBond.coupon * 100).toFixed(2)}%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>MATURITY DATE</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#f8fafc' }}>{activeBond.maturityDate}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>CCIL REF CLEAN PRICE</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#f8fafc' }}>₹{activeBond.currentCleanPrice.toFixed(4)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>CCIL REF YIELD (YTM)</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#f8fafc' }}>{(activeBond.currentYTM * 100).toFixed(4)}%</div>
                  </div>
                </div>
                
                <div style={{ borderTop: '1px solid #1e293b', paddingTop: '15px', marginTop: '10px' }} className="font-mono">
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>SANDBOX INSTRUCTION MANUAL:</div>
                  <ul style={{ fontSize: '11px', color: '#94a3b8', paddingLeft: '15px', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <li>Select a G-Sec in the sidebar, enter your target Clean Price, and lot quantity (minimum lot size is ₹100 face value).</li>
                    <li>Submit your quote to list it on the global classroom board. For Buy bids, cash is held in escrow; for Sell asks, G-Sec units are blocked.</li>
                    <li>Head over to the <strong>Marketplace</strong> tab to browse and manually accept open quotes published by other students.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : currentTab === 'marketplace' ? (
          <MarketplaceBoard
            activeBond={activeBond}
            token={token}
            marketOrders={marketOrders}
            currentUsername={username}
            onTradeExecuted={() => {
              fetchPortfolio();
              fetchOrders();
              fetchMarketOrders();
            }}
          />
        ) : currentTab === 'portfolio' ? (
          <PortfolioView 
            portfolioData={portfolioData} 
            ordersData={ordersData} 
            onCancelOrder={handleCancelOrder} 
          />
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
