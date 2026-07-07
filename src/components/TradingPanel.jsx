import React, { useState, useEffect } from 'react';

export default function TradingPanel({ activeBond, token, userCash, onOrderPlaced }) {
  const [orderType, setOrderType] = useState('BUY'); // BUY or SELL
  const [quotePrice, setQuotePrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync quote price input with CCIL live reference price when G-Sec changes
  useEffect(() => {
    if (activeBond) {
      setQuotePrice(activeBond.currentCleanPrice.toFixed(4));
      setError('');
      setSuccess('');
    }
  }, [activeBond, orderType]);

  if (!token) {
    return (
      <div style={styles.emptyContainer} className="terminal-card font-mono">
        ★ Authenticate to access Sandbox Quoting Ticket.
      </div>
    );
  }

  const currentReferencePrice = activeBond ? activeBond.currentCleanPrice : 0;
  const priceVal = parseFloat(quotePrice) || 0;
  const qtyVal = parseInt(quantity) || 0;
  const estimatedValue = qtyVal * priceVal;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (priceVal <= 0) {
      setError('Please specify a positive quote price.');
      return;
    }

    if (qtyVal <= 0) {
      setError('Please specify a positive lot quantity.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          isin: activeBond.isin,
          orderType,
          price: priceVal,
          quantity: qtyVal
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit quote');
      }

      setSuccess(data.message);
      setQuantity('');
      if (onOrderPlaced) onOrderPlaced();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="terminal-card" style={styles.container}>
      <div style={styles.header} className="font-mono">
        ★ SUBMIT G-SEC MARKET QUOTE
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* BUY BIDS / SELL ASKS Switcher */}
        <div style={styles.tabContainer}>
          <button
            type="button"
            onClick={() => setOrderType('BUY')}
            style={{
              ...styles.tab,
              backgroundColor: orderType === 'BUY' ? 'rgba(20, 184, 166, 0.15)' : 'transparent',
              borderColor: orderType === 'BUY' ? 'var(--accent-teal)' : '#1e293b',
              color: orderType === 'BUY' ? 'var(--accent-teal)' : 'var(--text-muted)'
            }}
          >
            CREATE BUY BID
          </button>
          <button
            type="button"
            onClick={() => setOrderType('SELL')}
            style={{
              ...styles.tab,
              backgroundColor: orderType === 'SELL' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
              borderColor: orderType === 'SELL' ? 'var(--accent-red)' : '#1e293b',
              color: orderType === 'SELL' ? 'var(--accent-red)' : 'var(--text-muted)'
            }}
          >
            CREATE SELL ASK
          </button>
        </div>

        {/* Info alerts */}
        {error && (
          <div style={styles.error} className="font-mono">
            ⚠ {error}
          </div>
        )}
        {success && (
          <div style={styles.success} className="font-mono">
            ✔ {success}
          </div>
        )}

        {/* Quote Price Input */}
        <div style={styles.inputGroup}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={styles.label} className="font-mono">QUOTE RATE (clean price)</label>
            <span style={styles.refPrice} className="font-mono">
              CCIL Ref Price: ₹{currentReferencePrice.toFixed(4)}
            </span>
          </div>
          <input
            type="number"
            step="0.0001"
            value={quotePrice}
            onChange={(e) => setQuotePrice(e.target.value)}
            disabled={loading}
            style={styles.input}
          />
        </div>

        {/* Quantity Lot input */}
        <div style={styles.inputGroup}>
          <label style={styles.label} className="font-mono">QUANTITY (1 unit = ₹100 Face Value)</label>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 5000 lots"
              disabled={loading}
              style={styles.input}
            />
            {qtyVal > 0 && (
              <span style={styles.faceValueBadge} className="font-mono">
                Face Value: ₹{(qtyVal * 100).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Summary Card */}
        <div style={styles.summaryCard} className="font-mono">
          <div style={styles.summaryRow}>
            <span>Liquid Cash Balance:</span>
            <span style={{ fontWeight: 'bold' }}>₹{(userCash || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div style={styles.summaryRow}>
            <span>{orderType === 'BUY' ? 'Required Escrow:' : 'Proceeds on Execution:'}</span>
            <span style={{ 
              fontWeight: 'bold', 
              color: orderType === 'BUY' ? 'var(--accent-teal)' : 'var(--accent-red)' 
            }}>
              ₹{estimatedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            ...styles.submitBtn,
            borderColor: orderType === 'BUY' ? 'var(--accent-teal)' : 'var(--accent-red)',
            color: orderType === 'BUY' ? 'var(--accent-teal)' : 'var(--accent-red)',
            backgroundColor: orderType === 'BUY' ? 'rgba(20, 184, 166, 0.05)' : 'rgba(239, 68, 68, 0.05)'
          }}
          className="mode-tab font-bold"
        >
          {loading ? 'PUBLISHING...' : `PUBLISH ${orderType} QUOTE LISTING`}
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#0a0f1d',
    border: '1px solid #1e293b',
    borderRadius: '12px'
  },
  header: {
    fontSize: '12px',
    color: '#f8fafc',
    letterSpacing: '1px',
    fontWeight: 'bold',
    marginBottom: '15px'
  },
  emptyContainer: {
    padding: '30px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '13px',
    border: '1px dashed #1e293b',
    borderRadius: '8px',
    backgroundColor: '#070c15'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px'
  },
  tabContainer: {
    display: 'flex',
    gap: '10px'
  },
  tab: {
    flex: 1,
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s',
    letterSpacing: '0.5px'
  },
  error: {
    padding: '10px',
    fontSize: '11px',
    color: 'var(--accent-red)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    border: '1px solid rgba(239, 68, 68, 0.15)',
    borderRadius: '6px',
    lineHeight: '1.4'
  },
  success: {
    padding: '10px',
    fontSize: '11px',
    color: 'var(--accent-teal)',
    backgroundColor: 'rgba(20, 184, 166, 0.05)',
    border: '1px solid rgba(20, 184, 166, 0.15)',
    borderRadius: '6px',
    lineHeight: '1.4'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    letterSpacing: '0.5px'
  },
  refPrice: {
    fontSize: '10px',
    color: 'var(--text-muted)'
  },
  input: {
    backgroundColor: '#050810',
    border: '1px solid #1e293b',
    borderRadius: '6px',
    padding: '11px',
    color: '#f8fafc',
    fontSize: '13px',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box'
  },
  faceValueBadge: {
    position: 'absolute',
    right: '12px',
    top: '11px',
    fontSize: '10px',
    color: 'var(--text-muted)'
  },
  summaryCard: {
    padding: '12px',
    backgroundColor: '#070c15',
    border: '1px solid #1e293b',
    borderRadius: '6px',
    fontSize: '11px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    color: '#94a3b8'
  },
  submitBtn: {
    padding: '12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    letterSpacing: '1px',
    transition: 'all 0.2s',
    border: '1px solid'
  }
};
