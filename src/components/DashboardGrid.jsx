import React from 'react';

export default function DashboardGrid({ activeBond, metrics, settlementDate, onSelectMetric }) {
  if (!activeBond) {
    return (
      <div className="no-bond-selected-panel">
        <div className="terminal-glow-box">
          <h2>No Bond Selected</h2>
          <p>Please select a Government Security from the sidebar to inspect its analytics.</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 4
    }).format(val).replace('INR', '₹');
  };

  const getMetricClass = (name) => {
    return "metric-card hover-glow";
  };

  return (
    <div className="dashboard-grid-container">
      {/* Bond Header Info */}
      <header className="bond-profile-header">
        <div className="bond-profile-main">
          <div className="bond-tag-name">
            <h2>{activeBond.name}</h2>
            <span className="badge-gsec">GOI Sovereign</span>
          </div>
          <p className="bond-isin-sub">ISIN: <span>{activeBond.isin}</span></p>
        </div>
        
        <div className="bond-profile-stats">
          <div className="profile-stat-item">
            <span className="stat-label">Outstanding Stock</span>
            <span className="stat-value">₹ {activeBond.outstandingAmount.toLocaleString('en-IN')} Cr</span>
          </div>
          <div className="profile-stat-item">
            <span className="stat-label">Issue Date</span>
            <span className="stat-value">{activeBond.issueDate}</span>
          </div>
          <div className="profile-stat-item">
            <span className="stat-label">Maturity Date</span>
            <span className="stat-value">{activeBond.maturityDate}</span>
          </div>
          <div className="profile-stat-item">
            <span className="stat-label">Settlement Date</span>
            <span className="stat-value text-teal">{settlementDate}</span>
          </div>
        </div>
      </header>

      {/* Main Grid of Analytics Metrics */}
      <section className="metrics-grid">
        {/* Row 1: Pricing */}
        <div 
          className={getMetricClass('cleanPrice')} 
          onClick={() => onSelectMetric('cleanPrice')}
        >
          <div className="metric-header">
            <span className="metric-title">Clean Price</span>
            <span className="metric-info-icon">?</span>
          </div>
          <div className="metric-value-container">
            <span className="metric-value">{formatCurrency(metrics.cleanPrice)}</span>
            <span className="metric-unit">per ₹100 Face Value</span>
          </div>
          <div className="metric-footer text-cyan">
            Transaction standard market quote
          </div>
        </div>

        <div 
          className={getMetricClass('accruedInterest')} 
          onClick={() => onSelectMetric('accruedInterest')}
        >
          <div className="metric-header">
            <span className="metric-title">Accrued Interest</span>
            <span className="metric-info-icon">?</span>
          </div>
          <div className="metric-value-container">
            <span className="metric-value">{formatCurrency(metrics.accruedInterest)}</span>
            <span className="metric-unit">since last coupon</span>
          </div>
          <div className="metric-footer text-amber">
            30/360 Accrued Basis
          </div>
        </div>

        <div 
          className={getMetricClass('dirtyPrice')} 
          onClick={() => onSelectMetric('dirtyPrice')}
        >
          <div className="metric-header">
            <span className="metric-title">Dirty Price</span>
            <span className="metric-info-icon">?</span>
          </div>
          <div className="metric-value-container">
            <span className="metric-value">{formatCurrency(metrics.dirtyPrice)}</span>
            <span className="metric-unit">total cash outlay</span>
          </div>
          <div className="metric-footer text-emerald">
            Clean Price + Accrued
          </div>
        </div>

        {/* Row 2: Yields */}
        <div 
          className={getMetricClass('ytm')} 
          onClick={() => onSelectMetric('ytm')}
        >
          <div className="metric-header">
            <span className="metric-title">Yield to Maturity (YTM)</span>
            <span className="metric-info-icon">?</span>
          </div>
          <div className="metric-value-container">
            <span className="metric-value">{(metrics.modifiedDuration === 0 ? 0 : metrics.ytm * 100).toFixed(4)}%</span>
            <span className="metric-unit">annualized</span>
          </div>
          <div className="metric-footer text-gold">
            Bisection Solved (Semiannual Compounding)
          </div>
        </div>

        <div 
          className={getMetricClass('currentYield')} 
          onClick={() => onSelectMetric('currentYield')}
        >
          <div className="metric-header">
            <span className="metric-title">Current Yield</span>
            <span className="metric-info-icon">?</span>
          </div>
          <div className="metric-value-container">
            <span className="metric-value">
              {metrics.cleanPrice > 0 ? ((activeBond.coupon / metrics.cleanPrice) * 100 * 100).toFixed(4).slice(0, -2) : '0.00'}%
            </span>
            <span className="metric-unit">Coupon / Clean Price</span>
          </div>
          <div className="metric-footer text-gray">
            Simple annual yield
          </div>
        </div>

        {/* Row 3: Risks */}
        <div 
          className={getMetricClass('macaulayDuration')} 
          onClick={() => onSelectMetric('macaulayDuration')}
        >
          <div className="metric-header">
            <span className="metric-title">Macaulay Duration</span>
            <span className="metric-info-icon">?</span>
          </div>
          <div className="metric-value-container">
            <span className="metric-value">{metrics.macaulayDuration.toFixed(4)}</span>
            <span className="metric-unit">years</span>
          </div>
          <div className="metric-footer text-violet">
            Weighted average timing of cash flows
          </div>
        </div>

        <div 
          className={getMetricClass('modifiedDuration')} 
          onClick={() => onSelectMetric('modifiedDuration')}
        >
          <div className="metric-header">
            <span className="metric-title">Modified Duration</span>
            <span className="metric-info-icon">?</span>
          </div>
          <div className="metric-value-container">
            <span className="metric-value">{metrics.modifiedDuration.toFixed(4)}</span>
            <span className="metric-unit">years</span>
          </div>
          <div className="metric-footer text-red">
            Interest rate price sensitivity (%)
          </div>
        </div>

        <div 
          className={getMetricClass('convexity')} 
          onClick={() => onSelectMetric('convexity')}
        >
          <div className="metric-header">
            <span className="metric-title">Convexity</span>
            <span className="metric-info-icon">?</span>
          </div>
          <div className="metric-value-container">
            <span className="metric-value">{metrics.convexity.toFixed(6)}</span>
            <span className="metric-unit">measure of curvature</span>
          </div>
          <div className="metric-footer text-pink">
            Second-order sensitivity multiplier
          </div>
        </div>

        <div 
          className={getMetricClass('dv01')} 
          onClick={() => onSelectMetric('dv01')}
        >
          <div className="metric-header">
            <span className="metric-title">DV01 (PVBP)</span>
            <span className="metric-info-icon">?</span>
          </div>
          <div className="metric-value-container">
            <span className="metric-value">{formatCurrency(metrics.dv01)}</span>
            <span className="metric-unit">per ₹100 face value</span>
          </div>
          <div className="metric-footer text-purple">
            Price impact for 1 bp yield decrease
          </div>
        </div>
      </section>
    </div>
  );
}
