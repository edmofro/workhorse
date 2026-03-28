export default function Home() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: '10px',
        color: 'var(--text-muted)',
        fontSize: '15px',
        fontWeight: 500,
        letterSpacing: '-0.01em',
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          background: 'var(--accent)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 13,
          color: 'white',
        }}
      >
        W
      </div>
      <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Workhorse</span>
    </div>
  );
}
