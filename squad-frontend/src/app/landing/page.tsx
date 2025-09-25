"use client";

import { useRouter } from "next/navigation";


export default function LandingPage() {
  const router = useRouter();

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #000000 0%, #111111 50%, #1a1a1a 100%)',
      color: 'white',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* Background gradient */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.03) 0%, transparent 50%), radial-gradient(circle at 40% 40%, rgba(255, 255, 255, 0.02) 0%, transparent 50%)',
        animation: 'float 20s ease-in-out infinite',
        zIndex: 0
      }} />

      {/* Hero Section */}
      <div style={{ 
        position: 'relative',
        zIndex: 1,
        textAlign: 'center',
        maxWidth: '800px',
        padding: '0 1.5rem'
      }}>
        <h1 style={{ 
          fontSize: '4rem',
          fontWeight: '800',
          color: '#ffffff',
          marginBottom: '1.5rem',
          letterSpacing: '-0.02em'
        }}>
          Safe Squad
        </h1>
        <p style={{ 
          fontSize: '1.25rem',
          color: 'rgba(255, 255, 255, 0.7)',
          marginBottom: '2.5rem',
          lineHeight: '1.6'
        }}>
          The modern way to create squads, manage approvals, and move funds
          securely on <span style={{ color: '#ffffff', fontWeight: '600' }}>Aptos</span>.
        </p>

        {/* Call to Action */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '1rem', 
          flexWrap: 'wrap' 
        }}>
          <button
            onClick={() => router.push("/auth/login")}
            style={{ 
              background: 'linear-gradient(135deg, #ffffff 0%, #cccccc 100%)',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 32px',
              color: '#000000',
              fontWeight: '600',
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(255, 255, 255, 0.2)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(255, 255, 255, 0.2)';
            }}
          >
            Login / Get Started
          </button>
          <button
            onClick={() => router.push("/")}
            style={{ 
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '12px',
              padding: '12px 32px',
              color: 'rgba(255, 255, 255, 0.8)',
              fontWeight: '600',
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
            }}
          >
            Go to Dashboard
          </button>
        </div>
      </div>

      {/* Features Section */}
      <div style={{ 
        position: 'relative',
        zIndex: 1,
        marginTop: '6rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '2rem',
        padding: '0 2rem',
        maxWidth: '1200px',
        width: '100%'
      }}>
        <FeatureCard
          title="🔒 Multi-Sig Approvals"
          description="Set custom thresholds. No funds move unless the squad agrees."
        />
        <FeatureCard
          title="⚡ Real-Time Treasury"
          description="Deposit, propose, approve, and execute fund transfers instantly."
        />
        <FeatureCard
          title="🤝 Squad Invites"
          description="Invite members off-chain, verify, then launch your squad on-chain."
        />
        <FeatureCard
          title="📜 Transparent History"
          description="Track proposals, votes, and executions in one clean dashboard."
        />
        <FeatureCard
          title="🌐 Cross-Chain Ready"
          description="Future-proof architecture designed for multi-chain expansion."
        />
        <FeatureCard
          title="💡 Simple & Modern UI"
          description="Built for humans, not just devs. Smooth, minimal, and powerful."
        />
      </div>

      {/* Footer */}
      <footer style={{ 
        position: 'relative',
        zIndex: 1,
        marginTop: '5rem',
        padding: '2.5rem 0',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        width: '100%',
        textAlign: 'center',
        color: 'rgba(255, 255, 255, 0.5)'
      }}>
        <p>
          🚀 Safe squad © {new Date().getFullYear()} – Secure treasury management
          on Aptos
        </p>
      </footer>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translate(0px, 0px) rotate(0deg); }
          33% { transform: translate(30px, -30px) rotate(120deg); }
          66% { transform: translate(-20px, 20px) rotate(240deg); }
        }
      `}</style>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div style={{ 
      background: 'rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '16px',
      padding: '1.5rem',
      transition: 'all 0.3s ease',
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
      e.currentTarget.style.boxShadow = '0 8px 32px rgba(255, 255, 255, 0.1)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
      e.currentTarget.style.boxShadow = 'none';
    }}
    >
      <h3 style={{ 
        fontSize: '1.25rem', 
        fontWeight: '600', 
        marginBottom: '0.75rem', 
        color: '#ffffff' 
      }}>
        {title}
      </h3>
      <p style={{ 
        color: 'rgba(255, 255, 255, 0.7)',
        lineHeight: '1.5'
      }}>
        {description}
      </p>
    </div>
  );
}
