import React, { useState } from 'react';

export default function PortfolioView({ portfolioData, ordersData, onCancelOrder }) {
  const [activeSubTab, setActiveSubTab] = useState('holdings'); // holdings, pending, history
  const [cancellingId, setCancellingId] = useState(null);

  if (!portfolioData) {
    return (
      <div style={styles.emptyContainer} className="terminal-card font-mono">
        ★ Authenticate to view and monitor your ₹1 Crore G-Sec broker sandbox.
      </div>
    );
  }

  const { cashBalance, reservedBalance, holdings } = portfolioData;
  const pendingOrders = ordersData && ordersData.pending ? ordersData.pending : [];
  const tradeHistory = ordersData && ordersData.history ? ordersData.history : [];

  // Calculate overall metrics
  const bondMarketValue = holdings.reduce((sum, h) => sum + (h.quantity * h.currentPrice), 0);
  const totalNetWorth = cashBalance + reservedBalance + bondMarketValue;
  
  const totalPL = totalNetWorth - 10000000.0; // P&L relative to the starting ₹1 Crore seed capital
  const totalPLPercent = (totalPL / 10000000.0) * 100;

  // Formatting helpers
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val);
  };

  const handleCancel = async (orderId) => {
    setCancellingId(orderId);
    if (onCancelOrder) {
      await onCancelOrder(orderId);
    }
    setCancellingId(null);
  };

  return (
    <div style={styles.container}>
      {/* Portfolio Header Cards */}
      <div style={styles.grid}>
        {/* Net Worth Card */}
        <div className="terminal-card" style={styles.card}>
          <div style={styles.cardHeader} className="font-mono">NET PORTFOLIO VALUE</div>
          <div style={styles.cardValue}>{formatCurrency(totalNetWorth)}</div>
          <div style={styles.cardSubtext} className="font-mono">
            Starting Seed Capital: <strong style={{ color: '#94a3b8' }}>₹1.00 Cr</strong>
          </div>
        </div>

        {/* Total Profit/Loss Card */}
        <div className="terminal-card" style={styles.card}>
          <div style={styles.cardHeader} className="font-mono">UNREALIZED PROFIT / LOSS</div>
          <div style={{
            ...styles.cardValue,
            color: totalPL >= 0 ? 'var(--accent-teal)' : 'var(--accent-red)'
          }}>
            {totalPL >= 0 ? '▲ +' : '▼ '}
            {formatCurrency(Math.abs(totalPL))}
          </div>
          <div style={styles.cardSubtext} className="font-mono">
            Return on Capital: {' '}
            <strong style={{ color: totalPL >= 0 ? 'var(--accent-teal)' : 'var(--accent-red)' }}>
              {totalPL >= 0 ? '+' : ''}{totalPLPercent.toFixed(4)}%
            </strong>
          </div>
        </div>

        {/* Cash Balance Card */}
        <div className="terminal-card" style={styles.card}>
          <div style={styles.cardHeader} className="font-mono">CASH BALANCE (LIQUIDITY)</div>
          <div style={styles.cardValue}>{formatCurrency(cashBalance)}</div>
          <div style={styles.cardSubtext} className="font-mono">
            {reservedBalance > 0 ? (
              <>In Escrow: <strong style={{ color: 'var(--accent-red)' }}>{formatCurrency(reservedBalance)}</strong></>
            ) : (
              <>Invested Ratio: <strong style={{ color: 'var(--accent-teal)' }}>
                {((bondMarketValue / totalNetWorth) * 100).toFixed(2)}%
              </strong></>
            )}
          </div>
        </div>
      </div>

      {/* Asset Allocation SVG Segment Bar */}
      <div className="terminal-card" style={styles.allocationCard}>
        <div style={styles.sectionHeader} className="font-mono">★ ASSET ALLOCATION</div>
        
        {/* Stacked allocation bar */}
        <div style={styles.stackedBar}>
          {holdings.map((h, idx) => {
            const widthPct = ((h.quantity * h.currentPrice) / totalNetWorth) * 100;
            const colors = ['#0ea5e9', '#14b8a6', '#f43f5e', '#a855f7', '#eab308'];
            const segmentColor = colors[idx % colors.length];
            return (
              <div
                key={h.isin}
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: segmentColor,
                  height: '100%',
                  transition: 'width 0.5s ease-in-out'
                }}
                title={`${h.name}: ${widthPct.toFixed(2)}%`}
              />
            );
          })}
          <div
            style={{
              width: `${(cashBalance / totalNetWorth) * 100}%`,
              backgroundColor: '#334155',
              height: '100%',
              transition: 'width 0.5s ease-in-out'
            }}
            title={`Cash Balance: ${((cashBalance / totalNetWorth) * 100).toFixed(2)}%`}
          />
          {reservedBalance > 0 && (
            <div
              style={{
                width: `${(reservedBalance / totalNetWorth) * 100}%`,
                backgroundColor: '#b91c1c',
                height: '100%',
                transition: 'width 0.5s ease-in-out'
              }}
              title={`Reserved Cash: ${((reservedBalance / totalNetWorth) * 100).toFixed(2)}%`}
            />
          )}
        </div>

        {/* Legend */}
        <div style={styles.legendGrid}>
          {holdings.map((h, idx) => {
            const colors = ['#0ea5e9', '#14b8a6', '#f43f5e', '#a855f7', '#eab308'];
            const segmentColor = colors[idx % colors.length];
            const allocationPct = ((h.quantity * h.currentPrice) / totalNetWorth) * 100;
            return (
              <div key={h.isin} style={styles.legendItem} className="font-mono">
                <span style={{ ...styles.legendColor, backgroundColor: segmentColor }} />
                <span>{h.isin} ({allocationPct.toFixed(1)}%)</span>
              </div>
            );
          })}
          <div style={styles.legendItem} className="font-mono">
            <span style={{ ...styles.legendColor, backgroundColor: '#334155' }} />
            <span>Cash ({((cashBalance / totalNetWorth) * 100).toFixed(1)}%)</span>
          </div>
          {reservedBalance > 0 && (
            <div style={styles.legendItem} className="font-mono">
              <span style={{ ...styles.legendColor, backgroundColor: '#b91c1c' }} />
              <span>Escrow ({((reservedBalance / totalNetWorth) * 100).toFixed(1)}%)</span>
            </div>
          )}
        </div>
      </div>

      {/* Sub Tab Navigation */}
      <div style={styles.subTabContainer} className="font-mono">
        <button
          onClick={() => setActiveSubTab('holdings')}
          style={{
            ...styles.subTabBtn,
            borderBottomColor: activeSubTab === 'holdings' ? 'var(--accent-teal)' : 'transparent',
            color: activeSubTab === 'holdings' ? 'var(--accent-teal)' : 'var(--text-muted)'
          }}
        >
          BOND HOLDINGS
        </button>
        <button
          onClick={() => setActiveSubTab('pending')}
          style={{
            ...styles.subTabBtn,
            borderBottomColor: activeSubTab === 'pending' ? 'var(--accent-teal)' : 'transparent',
            color: activeSubTab === 'pending' ? 'var(--accent-teal)' : 'var(--text-muted)'
          }}
        >
          PENDING ORDERS ({pendingOrders.length})
        </button>
        <button
          onClick={() => setActiveSubTab('history')}
          style={{
            ...styles.subTabBtn,
            borderBottomColor: activeSubTab === 'history' ? 'var(--accent-teal)' : 'transparent',
            color: activeSubTab === 'history' ? 'var(--accent-teal)' : 'var(--text-muted)'
          }}
        >
          TRANSACTION LOG
        </button>
      </div>

      {/* Conditional Sub-Tab Rendering */}
      {activeSubTab === 'holdings' && (
        <div className="terminal-card" style={styles.tableCard}>
          <div style={styles.sectionHeader} className="font-mono">★ BOND HOLDINGS MASTER</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow} className="font-mono">
                  <th style={styles.th}>SECURITY NAME</th>
                  <th style={styles.th}>ISIN</th>
                  <th style={styles.th}>QUANTITY</th>
                  <th style={styles.th}>AVG BUY PRICE</th>
                  <th style={styles.th}>CURRENT PRICE</th>
                  <th style={styles.th}>CURRENT VALUE</th>
                  <th style={styles.th}>UNREALIZED P&L</th>
                </tr>
              </thead>
              <tbody>
                {holdings.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={styles.noData} className="font-mono">
                      No holdings currently owned. Go to Market Watch to execute trades.
                    </td>
                  </tr>
                ) : (
                  holdings.map((h) => {
                    const currentVal = h.quantity * h.currentPrice;
                    const costBasis = h.quantity * h.averageBuyPrice;
                    const pl = currentVal - costBasis;
                    const plPct = (pl / costBasis) * 100;
                    
                    return (
                      <tr key={h.isin} style={styles.tr}>
                        <td style={styles.td} className="font-bold">{h.name}</td>
                        <td style={styles.td} className="font-mono text-muted">{h.isin}</td>
                        <td style={styles.td} className="font-mono">{h.quantity.toLocaleString()}</td>
                        <td style={styles.td} className="font-mono">{h.averageBuyPrice.toFixed(4)}</td>
                        <td style={styles.td} className="font-mono">{h.currentPrice.toFixed(4)}</td>
                        <td style={styles.td} className="font-mono font-bold">{formatCurrency(currentVal)}</td>
                        <td style={{
                          ...styles.td,
                          color: pl >= 0 ? 'var(--accent-teal)' : 'var(--accent-red)'
                        }} className="font-mono font-bold">
                          {pl >= 0 ? '+' : ''}{formatCurrency(pl)} ({pl >= 0 ? '+' : ''}{plPct.toFixed(4)}%)
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'pending' && (
        <div className="terminal-card" style={styles.tableCard}>
          <div style={styles.sectionHeader} className="font-mono">★ ACTIVE MARKET QUOTE LISTINGS</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow} className="font-mono">
                  <th style={styles.th}>SECURITY NAME</th>
                  <th style={styles.th}>ISIN</th>
                  <th style={styles.th}>LISTING TYPE</th>
                  <th style={styles.th}>QUOTE PRICE</th>
                  <th style={styles.th}>QUANTITY</th>
                  <th style={styles.th}>TOTAL VALUE</th>
                  <th style={styles.th}>SUBMISSION DATE</th>
                  <th style={styles.th}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {pendingOrders.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={styles.noData} className="font-mono">
                      No active quote listings.
                    </td>
                  </tr>
                ) : (
                  pendingOrders.map((o) => {
                    const estValue = o.quantity * o.price;
                    return (
                      <tr key={o.id} style={styles.tr}>
                        <td style={styles.td} className="font-bold">{o.name}</td>
                        <td style={styles.td} className="font-mono text-muted">{o.isin}</td>
                        <td style={{
                          ...styles.td,
                          color: o.orderType === 'BUY' ? 'var(--accent-teal)' : 'var(--accent-red)'
                        }} className="font-bold">{o.orderType}</td>
                        <td style={styles.td} className="font-mono">₹{o.price.toFixed(4)}</td>
                        <td style={styles.td} className="font-mono">{o.quantity.toLocaleString()}</td>
                        <td style={styles.td} className="font-mono">₹{estValue.toLocaleString()}</td>
                        <td style={styles.td} className="font-mono text-muted">{new Date(o.createdAt).toLocaleString()}</td>
                        <td style={styles.td}>
                          <button
                            onClick={() => handleCancel(o.id)}
                            disabled={cancellingId === o.id}
                            className="mode-tab font-bold"
                            style={{
                              borderColor: 'var(--accent-red)',
                              color: 'var(--accent-red)',
                              backgroundColor: 'rgba(239, 68, 68, 0.05)',
                              padding: '2px 8px',
                              fontSize: '11px',
                              cursor: 'pointer'
                            }}
                          >
                            {cancellingId === o.id ? 'CANCELLING...' : 'CANCEL'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'history' && (
        <div className="terminal-card" style={styles.tableCard}>
          <div style={styles.sectionHeader} className="font-mono">★ COMPLETED TRANSACTIONS LOG</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow} className="font-mono">
                  <th style={styles.th}>SECURITY NAME</th>
                  <th style={styles.th}>ISIN</th>
                  <th style={styles.th}>TRADE</th>
                  <th style={styles.th}>COUNTERPARTY</th>
                  <th style={styles.th}>EXECUTION RATE</th>
                  <th style={styles.th}>QUANTITY</th>
                  <th style={styles.th}>TOTAL SETTLED VALUE</th>
                  <th style={styles.th}>EXECUTION TIMESTAMP</th>
                </tr>
              </thead>
              <tbody>
                {tradeHistory.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={styles.noData} className="font-mono">
                      No settled transaction history.
                    </td>
                  </tr>
                ) : (
                  tradeHistory.map((t) => {
                    return (
                      <tr key={t.id} style={styles.tr}>
                        <td style={styles.td} className="font-bold">{t.name}</td>
                        <td style={styles.td} className="font-mono text-muted">{t.isin}</td>
                        <td style={{
                          ...styles.td,
                          color: t.tradeType === 'BUY' ? 'var(--accent-teal)' : 'var(--accent-red)'
                        }} className="font-bold">{t.tradeType}</td>
                        <td style={styles.td} className="font-mono">👤 {t.counterparty ? t.counterparty.toUpperCase() : 'MARKET'}</td>
                        <td style={styles.td} className="font-mono">₹{t.executionPrice.toFixed(4)}</td>
                        <td style={styles.td} className="font-mono">{t.quantity.toLocaleString()}</td>
                        <td style={styles.td} className="font-mono font-bold">{formatCurrency(t.totalValue)}</td>
                        <td style={styles.td} className="font-mono text-muted">{new Date(t.executedAt).toLocaleString()}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    padding: '5px 0'
  },
  emptyContainer: {
    padding: '40px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '14px',
    border: '1px dashed #1e293b',
    borderRadius: '8px',
    backgroundColor: '#070c15'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px'
  },
  card: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  cardHeader: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    letterSpacing: '1px'
  },
  cardValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#f8fafc'
  },
  cardSubtext: {
    fontSize: '11px',
    color: 'var(--text-muted)'
  },
  allocationCard: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  sectionHeader: {
    fontSize: '12px',
    color: '#f8fafc',
    letterSpacing: '1px',
    fontWeight: 'bold'
  },
  stackedBar: {
    display: 'flex',
    height: '24px',
    borderRadius: '6px',
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b'
  },
  legendGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px',
    marginTop: '5px'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '11px',
    color: 'var(--text-muted)'
  },
  legendColor: {
    width: '12px',
    height: '12px',
    borderRadius: '3px',
    display: 'inline-block'
  },
  subTabContainer: {
    display: 'flex',
    borderBottom: '1px solid #1e293b',
    gap: '15px'
  },
  subTabBtn: {
    padding: '8px 12px',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s',
    letterSpacing: '0.5px'
  },
  tableCard: {
    padding: '20px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '15px',
    textAlign: 'left'
  },
  thRow: {
    borderBottom: '1px solid #1e293b'
  },
  th: {
    padding: '12px',
    fontSize: '10px',
    color: 'var(--text-muted)',
    letterSpacing: '1px',
    fontWeight: 'bold'
  },
  tr: {
    borderBottom: '1px solid #0f172a',
    transition: 'background-color 0.2s'
  },
  td: {
    padding: '14px 12px',
    fontSize: '13px',
    color: '#e2e8f0'
  },
  noData: {
    padding: '25px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '12px'
  }
};
