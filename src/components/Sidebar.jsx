import React, { useState } from 'react';

export default function Sidebar({ bonds, activeBond, onSelectBond, settlementDate, currentTab, onTabChange, liveDataInfo }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [maturityFilter, setMaturityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name'); // name, maturity, ytm

  // Helper to determine maturity bucket (years from settlementDate)
  const getMaturityYears = (bond) => {
    const sDate = new Date(settlementDate);
    const mDate = new Date(bond.maturityDate);
    const diffTime = Math.max(0, mDate - sDate);
    return diffTime / (1000 * 60 * 60 * 24 * 365.25);
  };

  // Filter and sort logic
  const filteredBonds = bonds
    .filter((bond) => {
      const matchesSearch =
        bond.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bond.isin.toLowerCase().includes(searchQuery.toLowerCase());

      const yearsToMaturity = getMaturityYears(bond);
      let matchesMaturity = true;
      if (maturityFilter === 'short') matchesMaturity = yearsToMaturity < 3;
      else if (maturityFilter === 'medium') matchesMaturity = yearsToMaturity >= 3 && yearsToMaturity <= 7;
      else if (maturityFilter === 'long') matchesMaturity = yearsToMaturity > 7;

      return matchesSearch && matchesMaturity;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'maturity') {
        return new Date(a.maturityDate) - new Date(b.maturityDate);
      } else if (sortBy === 'ytm') {
        return b.currentYTM - a.currentYTM;
      }
      return 0;
    });

  return (
    <aside className="terminal-sidebar">
      <div className="sidebar-header" style={{ marginBottom: '10px' }}>
        <div className="logo-container">
          <span className="logo-glow"></span>
          <h1 className="app-title">Bond<span>IQ</span></h1>
        </div>
        <p className="app-subtitle" style={{ marginBottom: '15px' }}>Bloomberg for G-Secs</p>
        
        {/* Navigation Tabs */}
        <div style={styles.navContainer} className="font-mono">
          <button
            onClick={() => onTabChange('analytics')}
            style={{
              ...styles.navBtn,
              borderBottomColor: currentTab === 'analytics' ? 'var(--accent-teal)' : 'transparent',
              color: currentTab === 'analytics' ? 'var(--accent-teal)' : 'var(--text-muted)'
            }}
          >
            MARKET WATCH
          </button>
          <button
            onClick={() => onTabChange('quoting')}
            style={{
              ...styles.navBtn,
              borderBottomColor: currentTab === 'quoting' ? 'var(--accent-teal)' : 'transparent',
              color: currentTab === 'quoting' ? 'var(--accent-teal)' : 'var(--text-muted)'
            }}
          >
            MARKET QUOTING
          </button>
          <button
            onClick={() => onTabChange('portfolio')}
            style={{
              ...styles.navBtn,
              borderBottomColor: currentTab === 'portfolio' ? 'var(--accent-teal)' : 'transparent',
              color: currentTab === 'portfolio' ? 'var(--accent-teal)' : 'var(--text-muted)'
            }}
          >
            PORTFOLIO
          </button>
        </div>
      </div>

      {(currentTab === 'analytics' || currentTab === 'quoting') ? (
        <>
          <div className="sidebar-search">
            <input
              type="text"
              placeholder="Search by ISIN or Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button className="clear-search" onClick={() => setSearchQuery('')}>
                &times;
              </button>
            )}
          </div>

          <div className="sidebar-filters">
            <div className="filter-group">
              <label>Maturity</label>
              <div className="button-group">
                <button
                  className={maturityFilter === 'all' ? 'filter-btn active' : 'filter-btn'}
                  onClick={() => setMaturityFilter('all')}
                >
                  All
                </button>
                <button
                  className={maturityFilter === 'short' ? 'filter-btn active' : 'filter-btn'}
                  onClick={() => setMaturityFilter('short')}
                  title="Under 3 Years"
                >
                  Short
                </button>
                <button
                  className={maturityFilter === 'medium' ? 'filter-btn active' : 'filter-btn'}
                  onClick={() => setMaturityFilter('medium')}
                  title="3 - 7 Years"
                >
                  Med
                </button>
                <button
                  className={maturityFilter === 'long' ? 'filter-btn active' : 'filter-btn'}
                  onClick={() => setMaturityFilter('long')}
                  title="Over 7 Years"
                >
                  Long
                </button>
              </div>
            </div>

            <div className="filter-group select-group">
              <label htmlFor="sort-select">Sort By</label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-select"
              >
                <option value="name">Nomenclature</option>
                <option value="maturity">Maturity Date</option>
                <option value="ytm">Yield (Highest)</option>
              </select>
            </div>
          </div>

          <div className="bonds-list-container">
            <div className="list-count-badge">
              Showing {filteredBonds.length} Government Securities
            </div>
            
            {filteredBonds.length === 0 ? (
              <div className="no-bonds-found">
                No securities match your search/filter criteria.
              </div>
            ) : (
              <ul className="bonds-list">
                {filteredBonds.map((bond) => {
                  const isActive = activeBond && activeBond.isin === bond.isin;
                  const years = getMaturityYears(bond).toFixed(1);
                  return (
                    <li
                      key={bond.isin}
                      className={`bond-item ${isActive ? 'active' : ''}`}
                      onClick={() => onSelectBond(bond)}
                    >
                      <div className="bond-item-main">
                        <span className="bond-item-name">{bond.name}</span>
                        <span className="bond-item-yield">
                          {(bond.currentYTM * 100).toFixed(2)}% YTM
                        </span>
                      </div>
                      <div className="bond-item-sub">
                        <span className="bond-item-isin">{bond.isin}</span>
                        <span className="bond-item-tenor">{years} yrs</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      ) : (
        <div style={styles.portfolioHelper} className="font-mono text-muted">
          ★ Currently viewing your custom starting portfolio dashboard.<br /><br />
          To analyze other bonds or solve pricing/yield values, switch back to the **MARKET WATCH** tab.
        </div>
      )}

      <div className="sidebar-footer">
        <div className="connection-status">
          <span className={`status-dot ${liveDataInfo ? 'green' : 'orange'}`}></span>
          <span>{liveDataInfo ? 'NDS-OM Live DB Feed' : 'CCIL Feed Connected (EOD)'}</span>
        </div>
      </div>
    </aside>
  );
}

const styles = {
  navContainer: {
    display: 'flex',
    gap: '10px',
    borderBottom: '1px solid #1e293b',
    paddingBottom: '5px',
    width: '100%'
  },
  navBtn: {
    flex: 1,
    padding: '8px 5px',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s',
  },
  portfolioHelper: {
    flex: 1,
    padding: '20px 10px',
    fontSize: '12px',
    lineHeight: '1.5',
    textAlign: 'center'
  }
};
