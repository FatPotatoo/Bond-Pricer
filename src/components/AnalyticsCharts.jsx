import React, { useState } from 'react';
import { calculateCleanPriceFromYield } from '../utils/analyticsEngine.js';

export default function AnalyticsCharts({ activeBond, metrics, bonds, settlementDate }) {
  const [activeTab, setActiveTab] = useState('priceYield'); // priceYield, historical, cashflow, yieldCurve
  const [histMetric, setHistMetric] = useState('ytm'); // ytm or price (for historical tab)

  if (!activeBond) return null;

  // Chart dimensions
  const width = 550;
  const height = 280;
  const padding = 45;

  // 1. PRICE VS YIELD CURVE DATA GENERATION
  const generatePriceYieldData = () => {
    const data = [];
    const minYield = 0.02; // 2%
    const maxYield = 0.14; // 14%
    const steps = 20;

    for (let i = 0; i <= steps; i++) {
      const y = minYield + (maxYield - minYield) * (i / steps);
      const price = calculateCleanPriceFromYield(
        y,
        settlementDate,
        activeBond.maturityDate,
        activeBond.issueDate,
        activeBond.coupon,
        100
      );
      data.push({ yieldVal: y * 100, price });
    }
    return data;
  };

  // 2. YIELD CURVE (TERM STRUCTURE) DATA GENERATION
  const generateYieldCurveData = () => {
    const sDate = new Date(settlementDate);
    return bonds.map(bond => {
      const mDate = new Date(bond.maturityDate);
      const yearsToMaturity = Math.max(0.1, (mDate - sDate) / (1000 * 60 * 60 * 24 * 365.25));
      return {
        name: bond.name,
        x: yearsToMaturity,
        y: bond.currentYTM * 100
      };
    }).sort((a, b) => a.x - b.x);
  };

  // SVG Drawing Helpers
  const renderPriceYieldChart = () => {
    const data = generatePriceYieldData();
    const currentY = metrics.ytm * 100;
    const currentP = metrics.cleanPrice;

    // Find min/max for scaling
    const yields = data.map(d => d.yieldVal);
    const prices = data.map(d => d.price);

    const minX = Math.min(...yields);
    const maxX = Math.max(...yields);
    const minY = Math.min(...prices) - 2;
    const maxY = Math.max(...prices) + 2;

    const scaleX = (x) => padding + ((x - minX) / (maxX - minX)) * (width - 2 * padding);
    const scaleY = (y) => height - padding - ((y - minY) / (maxY - minY)) * (height - 2 * padding);

    // Build SVG Path
    let pathD = '';
    data.forEach((d, i) => {
      const sx = scaleX(d.yieldVal);
      const sy = scaleY(d.price);
      if (i === 0) pathD = `M ${sx} ${sy}`;
      else pathD += ` L ${sx} ${sy}`;
    });

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="svg-chart">
        {/* Gradients */}
        <defs>
          <linearGradient id="curveGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Grid Lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
          const yVal = minY + r * (maxY - minY);
          const sy = scaleY(yVal);
          return (
            <g key={i}>
              <line x1={padding} y1={sy} x2={width - padding} y2={sy} className="chart-grid-line" />
              <text x={padding - 8} y={sy + 4} className="chart-axis-text text-right" textAnchor="end">
                ₹{yVal.toFixed(0)}
              </text>
            </g>
          );
        })}

        {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
          const xVal = minX + r * (maxX - minX);
          const sx = scaleX(xVal);
          return (
            <g key={i}>
              <line x1={sx} y1={padding} x2={sx} y2={height - padding} className="chart-grid-line" />
              <text x={sx} y={height - padding + 16} className="chart-axis-text text-center" textAnchor="middle">
                {xVal.toFixed(1)}%
              </text>
            </g>
          );
        })}

        {/* Chart Line */}
        <path d={pathD} fill="none" stroke="url(#curveGrad)" strokeWidth="3" />

        {/* Current Position Marker */}
        {currentY >= minX && currentY <= maxX && (
          <g>
            <line 
              x1={scaleX(currentY)} y1={padding} 
              x2={scaleX(currentY)} y2={height - padding} 
              className="chart-crosshair-line" 
            />
            <line 
              x1={padding} y1={scaleY(currentP)} 
              x2={width - padding} y2={scaleY(currentP)} 
              className="chart-crosshair-line" 
            />
            <circle 
              cx={scaleX(currentY)} 
              cy={scaleY(currentP)} 
              r="6" 
              className="chart-marker-dot" 
              filter="url(#glow)"
            />
            <rect 
              x={scaleX(currentY) - 45} 
              y={scaleY(currentP) - 30} 
              width="90" 
              height="20" 
              rx="4" 
              className="chart-tooltip-bg" 
            />
            <text 
              x={scaleX(currentY)} 
              y={scaleY(currentP) - 16} 
              className="chart-tooltip-text" 
              textAnchor="middle"
            >
              {currentY.toFixed(2)}%, ₹{currentP.toFixed(2)}
            </text>
          </g>
        )}

        {/* Labels */}
        <text x={width / 2} y={height - 5} className="chart-label-text" textAnchor="middle">
          Yield to Maturity (YTM)
        </text>
        <text x="12" y={height / 2} className="chart-label-text rotated" textAnchor="middle" transform={`rotate(-90, 12, ${height / 2})`}>
          Clean Price (₹)
        </text>
      </svg>
    );
  };

  const renderHistoricalChart = () => {
    const history = activeBond.history;
    if (!history || history.length === 0) return null;

    const values = history.map(d => histMetric === 'ytm' ? d.ytm * 100 : d.cleanPrice);
    const minVal = Math.min(...values) * 0.995;
    const maxVal = Math.max(...values) * 1.005;

    const scaleX = (index) => padding + (index / (history.length - 1)) * (width - 2 * padding);
    const scaleY = (val) => height - padding - ((val - minVal) / (maxVal - minVal)) * (height - 2 * padding);

    // Build path
    let pathD = '';
    history.forEach((d, i) => {
      const val = histMetric === 'ytm' ? d.ytm * 100 : d.cleanPrice;
      const sx = scaleX(i);
      const sy = scaleY(val);
      if (i === 0) pathD = `M ${sx} ${sy}`;
      else pathD += ` L ${sx} ${sy}`;
    });

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="svg-chart">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={histMetric === 'ytm' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(6, 182, 212, 0.2)'} />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
          const val = minVal + r * (maxVal - minVal);
          const sy = scaleY(val);
          return (
            <g key={i}>
              <line x1={padding} y1={sy} x2={width - padding} y2={sy} className="chart-grid-line" />
              <text x={padding - 8} y={sy + 4} className="chart-axis-text" textAnchor="end">
                {histMetric === 'ytm' ? `${val.toFixed(2)}%` : `₹${val.toFixed(1)}`}
              </text>
            </g>
          );
        })}

        {/* X Axis dates (draw 4 ticks) */}
        {[0, 9, 19, 29].map((idx) => {
          const d = history[idx];
          if (!d) return null;
          const sx = scaleX(idx);
          const shortDate = d.date.substring(5); // MM-DD
          return (
            <g key={idx}>
              <line x1={sx} y1={padding} x2={sx} y2={height - padding} className="chart-grid-line" />
              <text x={sx} y={height - padding + 16} className="chart-axis-text" textAnchor="middle">
                {shortDate}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path
          d={`${pathD} L ${scaleX(history.length - 1)} ${height - padding} L ${scaleX(0)} ${height - padding} Z`}
          fill="url(#areaGrad)"
        />

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke={histMetric === 'ytm' ? '#f59e0b' : '#06b6d4'}
          strokeWidth="2.5"
        />

        {/* Highlight last dot */}
        <circle
          cx={scaleX(history.length - 1)}
          cy={scaleY(values[values.length - 1])}
          r="4.5"
          fill={histMetric === 'ytm' ? '#f59e0b' : '#06b6d4'}
        />

        {/* Axis Labels */}
        <text x={width / 2} y={height - 5} className="chart-label-text" textAnchor="middle">
          Simulation Timeline (Last 30 Days)
        </text>
        <text x="12" y={height / 2} className="chart-label-text rotated" textAnchor="middle" transform={`rotate(-90, 12, ${height / 2})`}>
          {histMetric === 'ytm' ? 'Yield to Maturity (%)' : 'Clean Price (₹)'}
        </text>
      </svg>
    );
  };

  const renderCashFlowTimeline = () => {
    const cashFlows = metrics.cashFlows;
    if (!cashFlows || cashFlows.length === 0) return null;

    const amounts = cashFlows.map(cf => cf.amount);
    const maxAmt = Math.max(...amounts);
    
    // Scale X by index
    const scaleX = (index) => padding + (index / (cashFlows.length - 1 || 1)) * (width - 2 * padding);
    // Scale Y by amount (0 to maxAmt)
    const scaleY = (amt) => height - padding - (amt / maxAmt) * (height - 2 * padding - 15);

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="svg-chart">
        {/* Grid lines */}
        {[0, 0.5, 1].map((r, i) => {
          const val = r * maxAmt;
          const sy = scaleY(val);
          return (
            <g key={i}>
              <line x1={padding} y1={sy} x2={width - padding} y2={sy} className="chart-grid-line" />
              <text x={padding - 8} y={sy + 4} className="chart-axis-text" textAnchor="end">
                ₹{val.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Render Bars */}
        {cashFlows.map((cf, idx) => {
          const cx = scaleX(idx);
          const cy = scaleY(cf.amount);
          const isRed = cf.type === 'Redemption';
          const barWidth = Math.max(6, Math.min(22, (width - 2 * padding) / (cashFlows.length * 1.6)));
          
          return (
            <g key={idx}>
              {/* Bar */}
              <rect
                x={cx - barWidth / 2}
                y={cy}
                width={barWidth}
                height={height - padding - cy}
                rx="2"
                className={`chart-bar ${isRed ? 'redemption-bar' : 'coupon-bar'}`}
              />
              {/* Tooltip on hover */}
              <text x={cx} y={cy - 6} className="chart-bar-value-text" textAnchor="middle">
                ₹{cf.amount.toFixed(0)}
              </text>
              {/* Date labels for key nodes */}
              {(cashFlows.length < 12 || idx === 0 || idx === cashFlows.length - 1 || idx === Math.floor(cashFlows.length / 2)) && (
                <text x={cx} y={height - padding + 16} className="chart-axis-text shrink-text" textAnchor="middle">
                  {cf.date.substring(5)}
                </text>
              )}
            </g>
          );
        })}

        <text x={width / 2} y={height - 5} className="chart-label-text" textAnchor="middle">
          Cash Flow Schedule Dates (MM-DD)
        </text>
      </svg>
    );
  };

  const renderYieldCurveChart = () => {
    const data = generateYieldCurveData();
    if (data.length === 0) return null;

    const xVals = data.map(d => d.x);
    const yVals = data.map(d => d.y);

    const minX = 0; // Starts at 0 tenor
    const maxX = Math.max(...xVals) + 1;
    const minY = Math.min(...yVals) - 0.2;
    const maxY = Math.max(...yVals) + 0.2;

    const scaleX = (x) => padding + (x / maxX) * (width - 2 * padding);
    const scaleY = (y) => height - padding - ((y - minY) / (maxY - minY)) * (height - 2 * padding);

    // Build path
    let pathD = '';
    data.forEach((d, i) => {
      const sx = scaleX(d.x);
      const sy = scaleY(d.y);
      if (i === 0) pathD = `M ${sx} ${sy}`;
      else pathD += ` L ${sx} ${sy}`;
    });

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="svg-chart">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
          const val = minY + r * (maxY - minY);
          const sy = scaleY(val);
          return (
            <g key={i}>
              <line x1={padding} y1={sy} x2={width - padding} y2={sy} className="chart-grid-line" />
              <text x={padding - 8} y={sy + 4} className="chart-axis-text" textAnchor="end">
                {val.toFixed(2)}%
              </text>
            </g>
          );
        })}

        {/* X Tenors */}
        {[1, 2, 3, 5, 7, 10, 15, 20].map((t) => {
          if (t > maxX) return null;
          const sx = scaleX(t);
          return (
            <g key={t}>
              <line x1={sx} y1={padding} x2={sx} y2={height - padding} className="chart-grid-line" />
              <text x={sx} y={height - padding + 16} className="chart-axis-text" textAnchor="middle">
                {t}Y
              </text>
            </g>
          );
        })}

        {/* Curve line */}
        <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="3 3" />

        {/* Bond Nodes */}
        {data.map((d, i) => {
          const sx = scaleX(d.x);
          const sy = scaleY(d.y);
          const isActive = d.name === activeBond.name;
          
          return (
            <g key={i}>
              <circle
                cx={sx}
                cy={sy}
                r={isActive ? 6 : 4}
                className={isActive ? 'yield-node-active' : 'yield-node'}
              />
              <text
                x={sx}
                y={sy - 8}
                className="chart-node-label"
                textAnchor="middle"
              >
                {d.name.split(' ')[0]}
              </text>
            </g>
          );
        })}

        <text x={width / 2} y={height - 5} className="chart-label-text" textAnchor="middle">
          Tenor / Term to Maturity (Years)
        </text>
        <text x="12" y={height / 2} className="chart-label-text rotated" textAnchor="middle" transform={`rotate(-90, 12, ${height / 2})`}>
          Market Yield (%)
        </text>
      </svg>
    );
  };

  return (
    <div className="charts-card glass-panel">
      <div className="charts-tab-header">
        <div className="tab-buttons">
          <button
            className={`tab-btn ${activeTab === 'priceYield' ? 'active' : ''}`}
            onClick={() => setActiveTab('priceYield')}
          >
            Price vs Yield
          </button>
          <button
            className={`tab-btn ${activeTab === 'historical' ? 'active' : ''}`}
            onClick={() => setActiveTab('historical')}
          >
            Historical Trend
          </button>
          <button
            className={`tab-btn ${activeTab === 'cashflow' ? 'active' : ''}`}
            onClick={() => setActiveTab('cashflow')}
          >
            Cash Flow Timeline
          </button>
          <button
            className={`tab-btn ${activeTab === 'yieldCurve' ? 'active' : ''}`}
            onClick={() => setActiveTab('yieldCurve')}
          >
            Sovereign Yield Curve
          </button>
        </div>

        {activeTab === 'historical' && (
          <div className="metric-toggle-group">
            <button
              className={`toggle-sub-btn ${histMetric === 'ytm' ? 'active' : ''}`}
              onClick={() => setHistMetric('ytm')}
            >
              Yield
            </button>
            <button
              className={`toggle-sub-btn ${histMetric === 'price' ? 'active' : ''}`}
              onClick={() => setHistMetric('price')}
            >
              Price
            </button>
          </div>
        )}
      </div>

      <div className="charts-content">
        {activeTab === 'priceYield' && (
          <div className="chart-wrapper">
            <div className="chart-info">
              <h4>Clean Price-Yield Relationship (Inverse Sensitivity)</h4>
              <p>As the Yield to Maturity increases, the present value of future coupons decreases, driving the Clean Price lower. The curve highlights the bond's convexity.</p>
            </div>
            <div className="chart-canvas">{renderPriceYieldChart()}</div>
          </div>
        )}

        {activeTab === 'historical' && (
          <div className="chart-wrapper">
            <div className="chart-info">
              <h4>Simulated 30-Day Trading History</h4>
              <p>Demonstrates historical volatility. Fixed-income markets react to economic announcements (inflation, RBI repo policy shifts) changing the bond's market price.</p>
            </div>
            <div className="chart-canvas">{renderHistoricalChart()}</div>
          </div>
        )}

        {activeTab === 'cashflow' && (
          <div className="chart-wrapper">
            <div className="chart-info">
              <h4>Future Cash Flow Timeline</h4>
              <p>Visualizes the exact size of future payments. Standard coupons are small semiannual payments, whereas the final redemption includes the massive ₹100 principal payment.</p>
            </div>
            <div className="chart-canvas">{renderCashFlowTimeline()}</div>
          </div>
        )}

        {activeTab === 'yieldCurve' && (
          <div className="chart-wrapper">
            <div className="chart-info">
              <h4>Sovereign Term Structure of Interest Rates</h4>
              <p>Plots the Yields of outstanding Indian government bonds against their maturities. Shows the market's expectation of inflation and future interest rates.</p>
            </div>
            <div className="chart-canvas">{renderYieldCurveChart()}</div>
          </div>
        )}
      </div>
    </div>
  );
}
