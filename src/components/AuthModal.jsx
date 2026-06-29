import React, { useState } from 'react';

export default function AuthModal({ onAuthSuccess, onClose }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setError('');
    setLoading(true);
    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }

      if (data.token) {
        onAuthSuccess(data.token, data.username);
        if (onClose) onClose();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal} className="terminal-card">
        <div style={styles.header}>
          <h2 style={styles.title}>BondIQ Broker Sandbox</h2>
          {onClose && (
            <button onClick={onClose} style={styles.closeBtn}>
              &times;
            </button>
          )}
        </div>

        <div style={styles.tabContainer}>
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(''); }}
            style={{
              ...styles.tab,
              borderBottomColor: !isRegister ? 'var(--accent-teal)' : 'transparent',
              color: !isRegister ? 'var(--accent-teal)' : 'var(--text-muted)'
            }}
          >
            SIGN IN
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(''); }}
            style={{
              ...styles.tab,
              borderBottomColor: isRegister ? 'var(--accent-teal)' : 'transparent',
              color: isRegister ? 'var(--accent-teal)' : 'var(--text-muted)'
            }}
          >
            CREATE ACCOUNT
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {isRegister && (
            <div style={styles.alert} className="font-mono">
              ★ Creating an account allocates an initial starting portfolio of **₹1 Crore** worth of G-Secs + cash balance automatically!
            </div>
          )}

          {error && (
            <div style={styles.error} className="font-mono">
              Error: {error}
            </div>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label} className="font-mono">USERNAME</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. bond_trader_42"
              style={styles.input}
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label} className="font-mono">PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={styles.input}
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={styles.submitBtn}
            className="mode-tab font-bold"
          >
            {loading ? 'PROCESSING...' : isRegister ? 'INITIALIZE ₹1 CRORE SANDBOX' : 'ENTER TERMINAL'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(5, 8, 16, 0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  modal: {
    width: '450px',
    padding: '30px',
    backgroundColor: '#0a0f1d',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#f8fafc',
    margin: 0,
    background: 'linear-gradient(90deg, #38bdf8, #14b8a6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '24px',
    cursor: 'pointer',
    padding: 0,
  },
  tabContainer: {
    display: 'flex',
    borderBottom: '1px solid #1e293b',
    marginBottom: '25px',
  },
  tab: {
    flex: 1,
    padding: '10px',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    fontSize: '12px',
    fontWeight: 'bold',
    letterSpacing: '1px',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  alert: {
    padding: '12px',
    fontSize: '11px',
    color: 'var(--accent-teal)',
    backgroundColor: 'rgba(20, 184, 166, 0.05)',
    border: '1px dashed rgba(20, 184, 166, 0.25)',
    borderRadius: '6px',
    lineHeight: '1.4',
  },
  error: {
    padding: '10px',
    fontSize: '12px',
    color: 'var(--accent-red)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    border: '1px solid rgba(239, 68, 68, 0.15)',
    borderRadius: '6px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    letterSpacing: '1px',
  },
  input: {
    backgroundColor: '#050810',
    border: '1px solid #1e293b',
    borderRadius: '6px',
    padding: '12px',
    color: '#f8fafc',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  submitBtn: {
    padding: '14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    letterSpacing: '1px',
    marginTop: '10px',
    transition: 'all 0.2s',
    border: '1px solid var(--accent-teal)',
    color: 'var(--accent-teal)',
    backgroundColor: 'rgba(20, 184, 166, 0.05)'
  }
};
