import React, { useState } from 'react';

export default function Sidebar({ bonds, activeBond, onSelectBond, settlementDate, liveDataInfo }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [maturityFilter, setMaturityFilter] = useState('all'); // all, short, med, long
  const [sortBy, setSortBy] = useState('nomenclature'); // nomenclature, yield, tenor

  // Helper to parse tenor (years to maturity)
  const getTenorYears = (maturityDateStr) => {
    try {
      const maturity = new Date(maturityDateStr);
      const settlement = new Date(settlementDate);
      const diffTime = maturity - settlement;
      if (isNaN(diffTime)) return 0.0;
      const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
      return Math.max(0.0, parseFloat(diffYears.toFixed(1)));
    } catch {
      return 0.0;
    }
  };

  // 1. FILTERING
  const filteredBonds = bonds.filter((bond) => {
    // Search query filter
    const matchesSearch =
      bond.isin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bond.name.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Maturity range filter
    const tenor = getTenorYears(bond.maturityDate);
    if (maturityFilter === 'short') return tenor < 3.0;
    if (maturityFilter === 'med') return tenor >= 3.0 && tenor <= 7.0;
    if (maturityFilter === 'long') return tenor > 7.0;

    return true;
  });

  // 2. SORTING
  const sortedBonds = [...filteredBonds].sort((a, b) => {
    if (sortBy === 'yield') {
      return b.currentYTM - a.currentYTM; // highest yield first
    }
    if (sortBy === 'tenor') {
      const tenorA = getTenorYears(a.maturityDate);
      const tenorB = getTenorYears(b.maturityDate);
      return tenorA - tenorB; // shortest tenor first
    }
    // Default: nomenclature/name alphabetical
    return a.name.localeCompare(b.name);
  });

  return (
    <aside className="terminal-sidebar">
      <div className="sidebar-header">
        <div className="logo-container">
          <span className="logo-glow"></span>
          <h1 className="app-title">Bond<span>IQ</span></h1>
        </div>
        <p className="app-subtitle">Bloomberg for G-Secs</p>
      </div>

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
          <label>MATURITY</label>
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
              className={maturityFilter === 'med' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setMaturityFilter('med')}
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

        <div className="filter-group">
          <label>SORT BY</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="nomenclature">Nomenclature</option>
            <option value="yield">solved YTM</option>
            <option value="tenor">Tenor</option>
          </select>
        </div>
      </div>

      <div className="bond-list-wrapper">
        <div className="list-stats font-mono" style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Securities: {sortedBonds.length}
        </div>

        {sortedBonds.length === 0 ? (
          <div className="empty-search font-mono">No matching securities found.</div>
        ) : (
          <ul className="bond-list">
            {sortedBonds.map((bond) => {
              const isActive = activeBond && activeBond.isin === bond.isin;
              const years = getTenorYears(bond.maturityDate);

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

      <div className="sidebar-footer">
        <div className="connection-status">
          <span className={`status-dot ${liveDataInfo ? 'green' : 'orange'}`}></span>
          <span>{liveDataInfo ? 'NDS-OM Live DB Feed' : 'CCIL Feed Connected (EOD)'}</span>
        </div>
      </div>
    </aside>
  );
}
