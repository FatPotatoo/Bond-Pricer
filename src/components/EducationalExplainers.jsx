import React from 'react';

export default function EducationalExplainers({ activeBond, metrics, selectedMetric, onClose }) {
  if (!selectedMetric || !activeBond) return null;

  const couponRatePct = (activeBond.coupon * 100).toFixed(2);
  const solvedYTMPct = (metrics.modifiedDuration === 0 ? 0 : metrics.ytm * 100).toFixed(4);

  // Content dictionary for explainers
  const explainersContent = {
    cleanPrice: {
      title: 'Clean Price',
      formula: '\\text{Clean Price} = \\text{Dirty Price} - \\text{Accrued Interest}',
      formulaText: 'Clean Price = Dirty Price - Accrued Interest',
      explanation: 'The Clean Price is the price of the bond excluding any interest that has accumulated since the last coupon payment date. This is the price quoted in the secondary markets (like NDS-OM in India or the CCIL market watch). Quoting clean prices prevents bond prices from dropping artificially immediately after a coupon payment.',
      calculation: `For ${activeBond.name}:
• Current Dirty Price (Calculated): ₹${metrics.dirtyPrice.toFixed(4)}
• Accrued Interest (Calculated): ₹${metrics.accruedInterest.toFixed(4)}
• Clean Price Quote: ₹${metrics.dirtyPrice.toFixed(4)} - ₹${metrics.accruedInterest.toFixed(4)} = ₹${metrics.cleanPrice.toFixed(4)}`,
      intuition: 'Think of Clean Price as the value of the bond itself, independent of the calendar date. If you buy a house, you pay for the house (Clean Price) plus a pro-rated share of the property tax that has accumulated since the last tax cycle (Accrued Interest). The clean price remains steady even as you approach the interest payment date.'
    },
    accruedInterest: {
      title: 'Accrued Interest',
      formula: '\\text{Accrued Interest} = F \\times \\frac{C}{2} \\times \\frac{D_{accrued}}{D_{period}}',
      formulaText: 'Accrued Interest = Face Value * (Coupon Rate / 2) * (Days Accrued / 180)',
      explanation: 'Accrued interest is the interest that has accumulated on a bond since the last interest payment date. Since coupons are paid semiannually, if you buy the bond between payment dates, you must compensate the seller for the portion of the coupon period they held the bond.',
      calculation: `For ${activeBond.name}:
• Face Value (F): ₹100
• Annual Coupon (C): ${couponRatePct}% (₹${(activeBond.coupon * 100 / 2).toFixed(2)} semiannual payment)
• 30/360 Days Accrued since last coupon: ${metrics.cashFlows && metrics.cashFlows.length > 0 ? (180 - metrics.cashFlows[0].daysTo % 180 === 180 ? 0 : 180 - metrics.cashFlows[0].daysTo % 180) : 0} days
• Total days in period: 180 days (30/360 standard)
• Accrued Interest = ₹100 × (${activeBond.coupon} / 2) × (Days Accrued / 180) = ₹${metrics.accruedInterest.toFixed(4)}`,
      intuition: 'If you work half a month before quitting, your employer owes you half a month of salary. Similarly, if a seller holds a bond for 90 out of 180 days of the coupon period, the buyer must pay the seller 50% of the upcoming coupon payment (₹2.08 on a 8.33% bond) at settlement.'
    },
    dirtyPrice: {
      title: 'Dirty Price (Settlement Price)',
      formula: '\\text{Dirty Price} = \\text{Clean Price} + \\text{Accrued Interest} = \\sum_{i=1}^n \\frac{CF_i}{(1 + y/2)^{2 t_i}}',
      formulaText: 'Dirty Price = Clean Price + Accrued Interest',
      explanation: 'The Dirty Price is the actual cash amount paid by the buyer to the seller on the settlement date. It is the true economic price of the bond, computed by taking the clean price quote and adding the accrued interest. It is also mathematically equal to the sum of the present values of all future cash flows discounted at the Yield to Maturity.',
      calculation: `For ${activeBond.name}:
• Input Clean Price: ₹${metrics.cleanPrice.toFixed(4)}
• Accrued Interest: ₹${metrics.accruedInterest.toFixed(4)}
• Total Outlay (Dirty Price): ₹${metrics.cleanPrice.toFixed(4)} + ₹${metrics.accruedInterest.toFixed(4)} = ₹${metrics.dirtyPrice.toFixed(4)}`,
      intuition: 'Dirty Price is the "all-in" price you actually pay. When a bond is purchased in the market, the wire transfer amount is always the Dirty Price, because the buyer is buying both the future principal/coupons (Clean Price) and the interest accrued so far (Accrued Interest).'
    },
    ytm: {
      title: 'Yield to Maturity (YTM)',
      formula: '\\text{Dirty Price} = \\sum_{i=1}^n \\frac{CF_i}{(1 + \\text{YTM}/2)^{2 t_i}}',
      formulaText: 'Dirty Price = Sum of [ Cash Flow_i / (1 + YTM/2)^(2 * t_i) ]',
      explanation: 'Yield to Maturity is the internal rate of return (IRR) of the bond. It is the interest rate that equates the present value of all future cash flows (coupons and principal repayment) to the current dirty price of the bond, assuming the bond is held to maturity and all coupons are reinvested at the same rate.',
      calculation: `For ${activeBond.name}:
• Target Dirty Price: ₹${metrics.dirtyPrice.toFixed(4)}
• Future Cash Flows: ${metrics.cashFlows ? metrics.cashFlows.length : 0} payments
• Numeric Solver (Bisection): Finds the rate 'y' such that discounting future payments gives exactly ₹${metrics.dirtyPrice.toFixed(4)}.
• Solved YTM: ${solvedYTMPct}%`,
      intuition: 'YTM is the standard yardstick used to compare bonds of different maturities and coupons. If YTM is 6.5%, it means that by purchasing this bond and reinvesting the coupons, you are earning an annualized return of 6.5% on your capital.'
    },
    macaulayDuration: {
      title: 'Macaulay Duration',
      formula: 'D_{mac} = \\frac{\\sum_{i=1}^n t_i \\times PV(CF_i)}{\\text{Dirty Price}}',
      formulaText: 'Macaulay Duration = Sum of [ time_i * PV(Cash Flow_i) ] / Dirty Price',
      explanation: 'Macaulay Duration is the weighted average time (in years) it takes for an investor to recover the bond\'s price from its cash flows. The weights are the present values of the cash flows themselves. A longer maturity or a lower coupon increases Macaulay Duration.',
      calculation: `For ${activeBond.name}:
• Weighted Cash Flow Times (t × PV): ₹${(metrics.macaulayDuration * metrics.dirtyPrice).toFixed(4)}
• Dirty Price (Sum of PV): ₹${metrics.dirtyPrice.toFixed(4)}
• Macaulay Duration: ${metrics.macaulayDuration.toFixed(4)} years`,
      intuition: 'Think of Macaulay Duration as the "center of gravity" of the bond\'s cash flows. Because a massive principal payment occurs at maturity (₹100), the center of gravity is pulled close to the maturity date. For zero-coupon bonds, Macaulay Duration equals exactly the maturity.'
    },
    modifiedDuration: {
      title: 'Modified Duration',
      formula: 'D_{mod} = \\frac{D_{mac}}{1 + \\text{YTM}/2}',
      formulaText: 'Modified Duration = Macaulay Duration / (1 + YTM / 2)',
      explanation: 'Modified Duration measures the price sensitivity of a bond to interest rate changes. It represents the approximate percentage change in a bond\'s price for a 1% (100 basis point) change in its yield. There is an inverse relationship: as yields rise, prices fall by (Modified Duration × Price).',
      calculation: `For ${activeBond.name}:
• Macaulay Duration: ${metrics.macaulayDuration.toFixed(4)} years
• Solved YTM: ${solvedYTMPct}% (${metrics.ytm.toFixed(6)})
• Modified Duration = ${metrics.macaulayDuration.toFixed(4)} / (1 + ${metrics.ytm.toFixed(6)} / 2) = ${metrics.modifiedDuration.toFixed(4)} years`,
      intuition: `If interest rates rise by 1.00% (100 bps), the price of ${activeBond.name} is expected to decline by approximately **${(metrics.modifiedDuration).toFixed(2)}%** (₹${(metrics.modifiedDuration * metrics.cleanPrice / 100).toFixed(2)}). Conversely, if interest rates fall by 1%, the price will rise by the same percentage.`
    },
    convexity: {
      title: 'Convexity',
      formula: '\\text{Convexity} = \\frac{1}{\\text{Dirty Price}} \\sum_{i=1}^n \\frac{PV(CF_i) \\times t_i \\times (t_i + 0.5)}{(1 + \\text{YTM}/2)^2}',
      formulaText: 'Convexity = Sum of [ PV_i * t_i * (t_i + 0.5) ] / [ Dirty Price * (1 + YTM/2)^2 ]',
      explanation: 'Convexity is a measure of the curvature of the price-yield relationship. While duration provides a linear approximation of price sensitivity, convexity corrects for the curvature. Bonds with higher convexity are less sensitive to interest rate hikes and more sensitive to interest rate cuts—a highly desirable property.',
      calculation: `For ${activeBond.name}:
• Calculated Convexity Index: ${metrics.convexity.toFixed(6)}
• Second-order price adjustment = 0.5 × Convexity × (ΔYield)^2`,
      intuition: 'Duration is like estimating a curved road with a straight line. If you drive far (large interest rate changes), the straight-line estimate becomes inaccurate. Convexity adds the "curve adjustment" to make the price estimate highly accurate.'
    },
    dv01: {
      title: 'DV01 (Dollar Value of an 01)',
      formula: '\\text{DV01} = D_{mod} \times \\text{Dirty Price} \\times 0.0001',
      formulaText: 'DV01 = Modified Duration * Dirty Price * 0.0001',
      explanation: 'DV01 (also known as PVBP - Price Value of a Basis Point) represents the absolute change in the bond\'s price (per ₹100 face value) for a 1 basis point (0.01%) change in the yield to maturity. It translates percentage sensitivity (duration) into concrete rupee risk.',
      calculation: `For ${activeBond.name}:
• Modified Duration: ${metrics.modifiedDuration.toFixed(4)} years
• Dirty Price: ₹${metrics.dirtyPrice.toFixed(4)}
• DV01 = ${metrics.modifiedDuration.toFixed(4)} × ₹${metrics.dirtyPrice.toFixed(4)} × 0.0001 = ₹${metrics.dv01.toFixed(6)}`,
      intuition: `If you hold ₹10,00,000 (10 Lakhs) of face value in ${activeBond.name}, your portfolio has 10,000 bonds. Since the DV01 is ₹${metrics.dv01.toFixed(4)} per bond, a 1 basis point increase in market yield will decrease your portfolio value by: 10,000 × ₹${metrics.dv01.toFixed(4)} = **₹${(metrics.dv01 * 10000).toFixed(0)}**.`
    },
    currentYield: {
      title: 'Current Yield',
      formula: '\\text{Current Yield} = \\frac{\\text{Annual Coupon Rate}}{\\text{Clean Price}}',
      formulaText: 'Current Yield = (Coupon Rate * 100) / Clean Price',
      explanation: 'Current Yield is a simple measure of the annual coupon income relative to the purchase clean price of the bond. Unlike YTM, it does not account for the capital gain or loss as the bond converges to par (₹100) at maturity, nor does it assume coupon reinvestment.',
      calculation: `For ${activeBond.name}:
• Annual Coupon Rate: ${couponRatePct}% (₹${(activeBond.coupon * 100).toFixed(2)} annual coupon)
• Clean Price: ₹${metrics.cleanPrice.toFixed(4)}
• Current Yield = ₹${(activeBond.coupon * 100).toFixed(2)} / ₹${metrics.cleanPrice.toFixed(4)} = ${metrics.cleanPrice > 0 ? ((activeBond.coupon / metrics.cleanPrice) * 100).toFixed(4) : '0.00'}%`,
      intuition: 'Current yield is similar to dividend yield for stocks. It represents the immediate cash-on-cash annual return. However, it is misleading for bonds trading far from par because it completely ignores that you will receive exactly ₹100 at maturity.'
    }
  };

  const content = explainersContent[selectedMetric];
  if (!content) return null;

  return (
    <div className="explainer-drawer-overlay" onClick={onClose}>
      <div className="explainer-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-title-group">
            <span className="drawer-glow"></span>
            <h2>{content.title}</h2>
          </div>
          <button className="close-drawer-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="drawer-body">
          {/* Section 1: Definition */}
          <section className="drawer-section">
            <h3>Definition</h3>
            <p className="drawer-text">{content.explanation}</p>
          </section>

          {/* Section 2: Mathematical Formula */}
          <section className="drawer-section math-section">
            <h3>Mathematical Formula</h3>
            <div className="formula-container font-mono">
              {content.formulaText}
            </div>
            <p className="drawer-caption">
              Where \(F\) = Face Value, \(C\) = Annual Coupon Rate, \(t\) = Time in years, \(PV\) = Present Value, and \(y\) = Yield to Maturity.
            </p>
          </section>

          {/* Section 3: Active Calculation */}
          <section className="drawer-section calc-section">
            <h3>Live Calculation for {activeBond.name}</h3>
            <div className="calculation-steps font-mono">
              {content.calculation.split('\n').map((line, idx) => (
                <div key={idx} className="calc-line">{line}</div>
              ))}
            </div>
          </section>

          {/* Section 4: Intuitive Insight */}
          <section className="drawer-section insight-section">
            <h3>Learning Insight (Intuitive Concept)</h3>
            <p className="drawer-text text-italic">{content.intuition}</p>
          </section>
        </div>

        <div className="drawer-footer">
          <button className="btn-close-accent" onClick={onClose}>Understand Metric</button>
        </div>
      </div>
    </div>
  );
}
