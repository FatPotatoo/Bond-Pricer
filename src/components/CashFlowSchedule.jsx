import React from 'react';

export default function CashFlowSchedule({ activeBond, metrics, settlementDate }) {
  if (!activeBond || !metrics.cashFlows || metrics.cashFlows.length === 0) {
    return null;
  }

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 4
    }).format(val).replace('INR', '₹');
  };

  const ytm = metrics.ytm;

  return (
    <div className="cashflows-card glass-panel">
      <div className="card-header-with-badge">
        <h3>Cash Flow & Discouting Schedule</h3>
        <span className="badge-details">Settlement: {settlementDate}</span>
      </div>
      
      <p className="cashflows-description">
        Below is the schedule of all future cash flows discounted to the settlement date at the solved YTM of <strong>{(metrics.modifiedDuration === 0 ? 0 : ytm * 100).toFixed(4)}%</strong>. 
        Notice that the sum of the present values of all future payments equals the bond's <strong>Dirty Price ({formatCurrency(metrics.dirtyPrice)})</strong>.
      </p>

      <div className="table-responsive-container">
        <table className="cashflows-table">
          <thead>
            <tr>
              <th className="text-center">#</th>
              <th>Payment Date</th>
              <th>Type</th>
              <th className="text-right">Cash Flow</th>
              <th className="text-center">Days to Pay</th>
              <th className="text-center">Year Fraction (t)</th>
              <th className="text-right">Discount Factor</th>
              <th className="text-right">Present Value (PV)</th>
            </tr>
          </thead>
          <tbody>
            {metrics.cashFlows.map((cf, index) => {
              const discountFactor = 1 / Math.pow(1 + ytm / 2, 2 * cf.timeTo);
              const presentValue = cf.amount * discountFactor;
              const isRedemption = cf.type === 'Redemption';

              return (
                <tr key={index} className={isRedemption ? 'row-redemption' : ''}>
                  <td className="text-center font-mono">{index + 1}</td>
                  <td>{cf.date}</td>
                  <td>
                    <span className={`type-badge ${cf.type.toLowerCase()}`}>
                      {cf.type}
                    </span>
                  </td>
                  <td className="text-right font-mono font-bold">{formatCurrency(cf.amount)}</td>
                  <td className="text-center font-mono">{cf.daysTo}</td>
                  <td className="text-center font-mono">{cf.timeTo.toFixed(4)}</td>
                  <td className="text-right font-mono text-dim">
                    {discountFactor.toFixed(6)}
                  </td>
                  <td className="text-right font-mono text-teal font-bold">
                    {formatCurrency(presentValue)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="3" className="text-left font-bold">Total Valuation Summary</td>
              <td className="text-right font-mono font-bold text-amber">
                {formatCurrency(metrics.cashFlows.reduce((acc, curr) => acc + curr.amount, 0))}
              </td>
              <td colSpan="3" className="text-right font-bold text-dim">Sum of Present Values =</td>
              <td className="text-right font-mono font-bold text-emerald border-double-top">
                {formatCurrency(metrics.dirtyPrice)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
