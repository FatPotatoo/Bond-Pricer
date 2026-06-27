import React, { useState, useEffect } from 'react';

export default function InteractiveCalculator({ activeBond, metrics, onCleanPriceChange, onYieldChange }) {
  const [calculatorMode, setCalculatorMode] = useState('priceToYield'); // 'priceToYield' or 'yieldToPrice'
  const [localPrice, setLocalPrice] = useState(metrics.cleanPrice);
  const [localYield, setLocalYield] = useState(metrics.ytm * 100);

  // Sync with parent metrics when the active bond changes or baseline prices update
  useEffect(() => {
    setLocalPrice(metrics.cleanPrice);
    setLocalYield(metrics.ytm * 100);
  }, [activeBond, metrics.cleanPrice, metrics.ytm]);

  const handlePriceSliderChange = (e) => {
    const val = parseFloat(e.target.value);
    setLocalPrice(val);
    onCleanPriceChange(val);
  };

  const handlePriceInputChange = (e) => {
    let val = parseFloat(e.target.value);
    if (isNaN(val)) val = 0;
    setLocalPrice(val);
    if (val >= 10 && val <= 200) { // Bound safeguard
      onCleanPriceChange(val);
    }
  };

  const handleYieldSliderChange = (e) => {
    const val = parseFloat(e.target.value);
    setLocalYield(val);
    onYieldChange(val / 100);
  };

  const handleYieldInputChange = (e) => {
    let val = parseFloat(e.target.value);
    if (isNaN(val)) val = 0;
    setLocalYield(val);
    if (val >= -20 && val <= 200) {
      onYieldChange(val / 100);
    }
  };

  // Determine Pricing Status (Premium, Par, Discount)
  const getPricingStatus = () => {
    const price = localPrice;
    if (Math.abs(price - 100) < 0.005) {
      return { text: 'Par Value', class: 'status-par', desc: 'Bond price equals face value (₹100).' };
    } else if (price > 100) {
      return { text: 'Trading at Premium', class: 'status-premium', desc: 'Bond price exceeds face value. Yield to Maturity is lower than the Coupon Rate.' };
    } else {
      return { text: 'Trading at Discount', class: 'status-discount', desc: 'Bond price is below face value. Yield to Maturity is higher than the Coupon Rate.' };
    }
  };

  const status = getPricingStatus();
  const couponRatePct = activeBond ? (activeBond.coupon * 100).toFixed(2) : '0.00';

  return (
    <div className="calculator-card glass-panel">
      <div className="calculator-header">
        <h3>Live Analytics Valuation Solver</h3>
        <div className="calculator-modes">
          <button
            className={`mode-tab ${calculatorMode === 'priceToYield' ? 'active' : ''}`}
            onClick={() => setCalculatorMode('priceToYield')}
          >
            Solve Yield (from Price)
          </button>
          <button
            className={`mode-tab ${calculatorMode === 'yieldToPrice' ? 'active' : ''}`}
            onClick={() => setCalculatorMode('yieldToPrice')}
          >
            Solve Price (from Yield)
          </button>
        </div>
      </div>

      <div className="calculator-body">
        {calculatorMode === 'priceToYield' ? (
          /* Solve Yield from Price */
          <div className="solver-section">
            <div className="control-group">
              <div className="control-labels">
                <label htmlFor="price-slider">Input Clean Price</label>
                <div className="input-with-symbol">
                  <span>₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="50"
                    max="150"
                    value={localPrice.toFixed(2)}
                    onChange={handlePriceInputChange}
                    className="numeric-input"
                  />
                </div>
              </div>
              <input
                id="price-slider"
                type="range"
                min="70"
                max="130"
                step="0.05"
                value={localPrice}
                onChange={handlePriceSliderChange}
                className="range-slider slider-price"
              />
              <div className="slider-limits">
                <span>₹70 (Discount)</span>
                <span>₹100 (Par)</span>
                <span>₹130 (Premium)</span>
              </div>
            </div>

            <div className="output-result-panel">
              <div className="result-item">
                <span className="result-label">Solved Yield to Maturity (YTM)</span>
                <span className="result-value text-gold">{(metrics.modifiedDuration === 0 ? 0 : metrics.ytm * 100).toFixed(4)}%</span>
              </div>
              <div className="result-item small-item">
                <span className="result-label">Annual Coupon Rate</span>
                <span className="result-value">{couponRatePct}%</span>
              </div>
            </div>
          </div>
        ) : (
          /* Solve Price from Yield */
          <div className="solver-section">
            <div className="control-group">
              <div className="control-labels">
                <label htmlFor="yield-slider">Input Target YTM</label>
                <div className="input-with-symbol">
                  <input
                    type="number"
                    step="0.01"
                    min="-10"
                    max="100"
                    value={localYield.toFixed(4)}
                    onChange={handleYieldInputChange}
                    className="numeric-input"
                  />
                  <span className="pct-symbol">%</span>
                </div>
              </div>
              <input
                id="yield-slider"
                type="range"
                min="2.00"
                max="15.00"
                step="0.01"
                value={localYield}
                onChange={handleYieldSliderChange}
                className="range-slider slider-yield"
              />
              <div className="slider-limits">
                <span>2.0%</span>
                <span>Coupon ({couponRatePct}%)</span>
                <span>15.0%</span>
              </div>
            </div>

            <div className="output-result-panel">
              <div className="result-item">
                <span className="result-label">Solved Clean Price Quote</span>
                <span className="result-value text-cyan">₹{metrics.cleanPrice.toFixed(4)}</span>
              </div>
              <div className="result-item small-item">
                <span className="result-label">Total Outlay (Dirty Price)</span>
                <span className="result-value">₹{metrics.dirtyPrice.toFixed(4)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Bond Pricing Status Gauge */}
        <div className={`status-gauge-panel ${status.class}`}>
          <div className="gauge-header">
            <span className="gauge-status-title">{status.text}</span>
            <span className="gauge-bullet"></span>
          </div>
          <p className="gauge-desc">{status.desc}</p>
          <div className="relationship-card">
            <div className="relationship-math">
              <span>Price</span>
              <span className="math-relation">{localPrice > 100 ? '>' : localPrice < 100 ? '<' : '='}</span>
              <span>₹100</span>
              <span className="math-separator">|</span>
              <span>YTM</span>
              <span className="math-relation">{(metrics.modifiedDuration === 0 ? 0 : metrics.ytm * 100) > (activeBond.coupon * 100) ? '>' : (metrics.modifiedDuration === 0 ? 0 : metrics.ytm * 100) < (activeBond.coupon * 100) ? '<' : '='}</span>
              <span>Coupon ({couponRatePct}%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
