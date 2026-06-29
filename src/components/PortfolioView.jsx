import React from 'react';

export default function PortfolioView({ portfolioData }) {
  if (!portfolioData) {
    return (
      <div style={styles.emptyContainer} className="terminal-card font-mono">
        ★ Authenticate to view and monitor your ₹1 Crore G-Sec broker sandbox.
      </div>
    );
  }

  const { cashBalance, holdings } = portfolioData;

  // Calculate overall metrics
  const bondMarketValue = holdings.reduce((sum, h) => sum + (h.quantity * h.currentPrice), 0);
  const totalNetWorth = cashBalance + bondMarketValue;
  const initialValue = holdings.reduce((sum, h) => sum + (h.quantity * h.averageBuyPrice), 0) + cashBalance; // starting value (~10,000,000)
  
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
            Invested Ratio: <strong style={{ color: 'var(--accent-teal)' }}>
              {((bondMarketValue / totalNetWorth) * 100).toFixed(2)}%
            </strong>
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
        </div>
      </div>

      {/* Holdings List Table */}
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
              {holdings.map((h) => {
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
              })}
            </tbody>
          </table>
        </div>
      </div>
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
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: 'rgba(255,255,255,0.01)'
    }
  },
  td: {
    padding: '14px 12px',
    fontSize: '13px',
    color: '#e2e8f0'
  }
};
