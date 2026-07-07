import React, { useState } from 'react';

export default function MarketplaceBoard({ activeBond, token, marketOrders, currentUsername, onTradeExecuted }) {
  const [acceptingId, setAcceptingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewMode, setViewMode] = useState('CURRENT'); // 'CURRENT' or 'ALL'

  if (!token) {
    return (
      <div style={styles.emptyContainer} className="terminal-card font-mono">
        ★ Authenticate to view active classroom student trade listings.
      </div>
    );
  }

  // Filter listings based on viewMode
  const displayListings = viewMode === 'CURRENT'
    ? marketOrders.filter(o => o.isin === activeBond.isin)
    : marketOrders;
  
  const buyListings = displayListings.filter(o => o.orderType === 'BUY').sort((a, b) => b.price - a.price); // highest bids first
  const sellListings = displayListings.filter(o => o.orderType === 'SELL').sort((a, b) => a.price - b.price); // cheapest asks first

  const handleAccept = async (orderId, orderType, price, qty) => {
    setError('');
    setSuccess('');
    setAcceptingId(orderId);

    const actionText = orderType === 'BUY' ? 'selling to' : 'buying from';
    const confirmTrade = window.confirm(`Confirm direct P2P trade: Are you sure you want to proceed with ${actionText} student listing at ₹${price.toFixed(4)} for ${qty.toLocaleString()} units?`);
    
    if (!confirmTrade) {
      setAcceptingId(null);
      return;
    }

    try {
      const response = await fetch(`/api/orders/${orderId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute trade acceptance');
      }

      setSuccess(data.message);
      if (onTradeExecuted) {
        onTradeExecuted();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <div className="terminal-card" style={styles.container}>
      <div style={styles.headerRow}>
        <div style={styles.header} className="font-mono">
          ★ CLASSROOM STUDENT MARKETPLACE BOARD
        </div>

        <div style={styles.toggleContainer} className="font-mono">
          <button
            onClick={() => setViewMode('CURRENT')}
            style={{
              ...styles.toggleBtn,
              borderColor: viewMode === 'CURRENT' ? 'var(--accent-teal)' : '#1e293b',
              color: viewMode === 'CURRENT' ? 'var(--accent-teal)' : 'var(--text-muted)',
              backgroundColor: viewMode === 'CURRENT' ? 'rgba(20, 184, 166, 0.05)' : 'transparent'
            }}
          >
            ACTIVE BOND ONLY
          </button>
          <button
            onClick={() => setViewMode('ALL')}
            style={{
              ...styles.toggleBtn,
              borderColor: viewMode === 'ALL' ? 'var(--accent-teal)' : '#1e293b',
              color: viewMode === 'ALL' ? 'var(--accent-teal)' : 'var(--text-muted)',
              backgroundColor: viewMode === 'ALL' ? 'rgba(20, 184, 166, 0.05)' : 'transparent'
            }}
          >
            ALL SECURITIES
          </button>
        </div>
      </div>

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

      <div style={styles.grid}>
        {/* BUY BIDS COLUMN */}
        <div style={styles.column}>
          <div style={styles.columnHeader} className="font-mono">
            BUY BIDS (Students looking to BUY)
          </div>
          
          <div style={styles.listContainer}>
            {buyListings.length === 0 ? (
              <div style={styles.noListings} className="font-mono text-muted">
                {viewMode === 'CURRENT' 
                  ? 'No active student buy quotes for this bond.' 
                  : 'No active student buy quotes in the market.'}
              </div>
            ) : (
              buyListings.map((listing) => {
                const totalValue = listing.quantity * listing.price;
                const isOwnOrder = currentUsername && listing.username.toLowerCase() === currentUsername.toLowerCase();
                
                return (
                  <div key={listing.id} style={{
                    ...styles.listingCard,
                    borderColor: isOwnOrder ? 'rgba(20, 184, 166, 0.2)' : '#1e293b',
                    backgroundColor: isOwnOrder ? 'rgba(20, 184, 166, 0.02)' : '#070c15'
                  }}>
                    {viewMode === 'ALL' && (
                      <div style={styles.bondLabel} className="font-mono font-bold">
                        BOND: {listing.name}
                      </div>
                    )}

                    <div style={styles.listingHeader}>
                      <span className="font-mono font-bold" style={{ color: isOwnOrder ? 'var(--accent-teal)' : '#f8fafc' }}>
                        STUDENT: {listing.username.toUpperCase()} {isOwnOrder && '(YOU)'}
                      </span>
                      <span style={styles.timestamp} className="font-mono">
                        {new Date(listing.createdAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <div style={styles.listingDetails} className="font-mono">
                      <div style={styles.detailsRow}>
                        <span>Bid Price:</span>
                        <strong style={{ color: 'var(--accent-teal)', fontSize: '13px' }}>₹{listing.price.toFixed(4)}</strong>
                      </div>
                      <div style={styles.detailsRow}>
                        <span>Quantity:</span>
                        <span>{listing.quantity.toLocaleString()} lots</span>
                      </div>
                      <div style={styles.detailsRow}>
                        <span>Face Value:</span>
                        <span>₹{(listing.quantity * 100).toLocaleString()}</span>
                      </div>
                      <div style={styles.detailsRow}>
                        <span>Total Escrow:</span>
                        <span>₹{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAccept(listing.id, 'BUY', listing.price, listing.quantity)}
                      disabled={isOwnOrder || acceptingId !== null}
                      style={{
                        ...styles.actionBtn,
                        backgroundColor: isOwnOrder ? 'transparent' : 'rgba(20, 184, 166, 0.08)',
                        borderColor: isOwnOrder ? '#1e293b' : 'var(--accent-teal)',
                        color: isOwnOrder ? 'var(--text-muted)' : 'var(--accent-teal)',
                        cursor: isOwnOrder ? 'not-allowed' : 'pointer'
                      }}
                      className="font-mono font-bold"
                    >
                      {acceptingId === listing.id ? 'TRANSACTING...' : isOwnOrder ? 'YOUR BID LISTING' : 'SELL TO STUDENT'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* SELL ASKS COLUMN */}
        <div style={styles.column}>
          <div style={styles.columnHeader} className="font-mono">
            SELL ASKS (Students looking to SELL)
          </div>

          <div style={styles.listContainer}>
            {sellListings.length === 0 ? (
              <div style={styles.noListings} className="font-mono text-muted">
                {viewMode === 'CURRENT' 
                  ? 'No active student sell quotes for this bond.' 
                  : 'No active student sell quotes in the market.'}
              </div>
            ) : (
              sellListings.map((listing) => {
                const totalValue = listing.quantity * listing.price;
                const isOwnOrder = currentUsername && listing.username.toLowerCase() === currentUsername.toLowerCase();
                
                return (
                  <div key={listing.id} style={{
                    ...styles.listingCard,
                    borderColor: isOwnOrder ? 'rgba(239, 68, 68, 0.2)' : '#1e293b',
                    backgroundColor: isOwnOrder ? 'rgba(239, 68, 68, 0.02)' : '#070c15'
                  }}>
                    {viewMode === 'ALL' && (
                      <div style={styles.bondLabel} className="font-mono font-bold">
                        BOND: {listing.name}
                      </div>
                    )}

                    <div style={styles.listingHeader}>
                      <span className="font-mono font-bold" style={{ color: isOwnOrder ? 'var(--accent-red)' : '#f8fafc' }}>
                        STUDENT: {listing.username.toUpperCase()} {isOwnOrder && '(YOU)'}
                      </span>
                      <span style={styles.timestamp} className="font-mono">
                        {new Date(listing.createdAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <div style={styles.listingDetails} className="font-mono">
                      <div style={styles.detailsRow}>
                        <span>Ask Price:</span>
                        <strong style={{ color: 'var(--accent-red)', fontSize: '13px' }}>₹{listing.price.toFixed(4)}</strong>
                      </div>
                      <div style={styles.detailsRow}>
                        <span>Quantity:</span>
                        <span>{listing.quantity.toLocaleString()} lots</span>
                      </div>
                      <div style={styles.detailsRow}>
                        <span>Face Value:</span>
                        <span>₹{(listing.quantity * 100).toLocaleString()}</span>
                      </div>
                      <div style={styles.detailsRow}>
                        <span>Required Cash:</span>
                        <span>₹{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAccept(listing.id, 'SELL', listing.price, listing.quantity)}
                      disabled={isOwnOrder || acceptingId !== null}
                      style={{
                        ...styles.actionBtn,
                        backgroundColor: isOwnOrder ? 'transparent' : 'rgba(239, 68, 68, 0.08)',
                        borderColor: isOwnOrder ? '#1e293b' : 'var(--accent-red)',
                        color: isOwnOrder ? 'var(--text-muted)' : 'var(--accent-red)',
                        cursor: isOwnOrder ? 'not-allowed' : 'pointer'
                      }}
                      className="font-mono font-bold"
                    >
                      {acceptingId === listing.id ? 'TRANSACTING...' : isOwnOrder ? 'YOUR ASK LISTING' : 'BUY FROM STUDENT'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
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
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    borderBottom: '1px solid #1e293b',
    paddingBottom: '12px'
  },
  header: {
    fontSize: '12px',
    color: '#f8fafc',
    letterSpacing: '1px',
    fontWeight: 'bold',
    margin: 0
  },
  toggleContainer: {
    display: 'flex',
    gap: '6px'
  },
  toggleBtn: {
    border: '1px solid',
    borderRadius: '4px',
    padding: '4px 10px',
    fontSize: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  bondLabel: {
    fontSize: '11px',
    color: '#e2e8f0',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderBottom: '1px solid #1e293b',
    paddingBottom: '6px',
    marginBottom: '4px',
    letterSpacing: '0.5px'
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
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  columnHeader: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    letterSpacing: '0.5px',
    borderBottom: '1px solid #1e293b',
    paddingBottom: '6px'
  },
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '400px',
    overflowY: 'auto',
    paddingRight: '4px'
  },
  noListings: {
    padding: '20px 10px',
    textAlign: 'center',
    fontSize: '11px',
    border: '1px dashed #1e293b',
    borderRadius: '6px'
  },
  listingCard: {
    border: '1px solid',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  listingHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '11px'
  },
  timestamp: {
    color: 'var(--text-muted)',
    fontSize: '9px'
  },
  listingDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '11px',
    color: '#94a3b8'
  },
  detailsRow: {
    display: 'flex',
    justifyContent: 'space-between'
  },
  actionBtn: {
    border: '1px solid',
    borderRadius: '6px',
    padding: '8px',
    fontSize: '11px',
    textAlign: 'center',
    transition: 'all 0.2s'
  },
  error: {
    padding: '10px',
    fontSize: '11px',
    color: 'var(--accent-red)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    border: '1px solid rgba(239, 68, 68, 0.15)',
    borderRadius: '6px',
    marginBottom: '15px'
  },
  success: {
    padding: '10px',
    fontSize: '11px',
    color: 'var(--accent-teal)',
    backgroundColor: 'rgba(20, 184, 166, 0.05)',
    border: '1px solid rgba(20, 184, 166, 0.15)',
    borderRadius: '6px',
    marginBottom: '15px'
  }
};
