export default function ComingSoonPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#FAF7F4',
      padding: '24px',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: '480px' }}>
        <p style={{
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: '#A87848',
          marginBottom: '16px',
          fontWeight: 500,
        }}>
          AI Personal Stylist
        </p>
        <h1 style={{
          fontFamily: 'Georgia, serif',
          fontSize: '48px',
          fontWeight: 400,
          color: '#1C1917',
          marginBottom: '16px',
          lineHeight: 1.2,
        }}>
          Capsology
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#78716C',
          lineHeight: 1.6,
          marginBottom: '32px',
        }}>
          Garderoba ta personalizată, creată de AI, vine în curând.
        </p>
        <div style={{
          width: '48px',
          height: '1px',
          background: '#D6D3D1',
          margin: '0 auto',
        }} />
      </div>
    </div>
  )
}
