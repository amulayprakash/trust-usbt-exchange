import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, Zap, TrendingUp, ArrowRight } from 'lucide-react'
import WalletModal from '@/components/wallet/WalletModal'
import useWalletStore from '@/store/useWalletStore'
import ElectricGrid from '@/components/common/ElectricGrid'

const CYAN = '#00e5ff'
const BG_MOBILE = '#080c14'
const BG_DESKTOP = '#080c14'

const FEATURES = [
  {
    icon: Lock,
    title: 'Non-Custodial Security',
    desc: 'Your keys, your coins. Private keys never leave your device.',
    color: 'from-[#00e5ff] to-[#0077b6]',
  },
  {
    icon: Zap,
    title: 'Instant TRC-20 Transfers',
    desc: 'Lightning-fast transactions on Tron with near-zero fees.',
    color: 'from-[#00b4d8] to-[#0077b6]',
  },
  {
    icon: TrendingUp,
    title: 'Earn Rewards',
    desc: 'Stake USBT and earn passive yield through our rewards program.',
    color: 'from-[#00e5ff] to-[#22d3ee]',
  },
]

const STATS = [
  { value: 'TRC-20', label: 'Network' },
  { value: '~$0.001', label: 'Avg. fee' },
  { value: '~2s', label: 'Block time' },
]

function USBTLogo({ className = 'w-10 h-10' }) {
  return <img src="/usbt-lolo.png" className={`${className} object-contain rounded-lg`} alt="USBT" />
}

function TokenBadge({ symbol, color }) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: `1px solid ${color}33`,
        backdropFilter: 'blur(12px)',
      }}
    >
      <span className="text-xs font-bold" style={{ color }}>{symbol}</span>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const { isConnected } = useWalletStore()
  const [showModal, setShowModal] = useState(false)

  if (isConnected) {
    navigate('/', { replace: true })
    return null
  }

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>

      {/* ════════════════════════════════════════
          MOBILE  (< md)
      ════════════════════════════════════════ */}
      <div
        className="md:hidden min-h-screen flex flex-col pb-safe relative overflow-hidden"
        style={{ background: BG_MOBILE }}
      >
        <ElectricGrid cols={7} rows={12} cell={52} color={CYAN} className="opacity-15" />

        {/* Radial vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 90% 70% at 50% 35%, transparent 20%, ${BG_MOBILE} 100%)` }}
        />

        {/* Ambient glow */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: -80, left: '50%', transform: 'translateX(-50%)',
            width: 320, height: 320, borderRadius: '50%',
            background: `${CYAN}08`, filter: 'blur(70px)',
          }}
        />

        {/* Hero content */}
        <div className="relative flex-1 flex flex-col items-center justify-center gap-5 px-6 pt-16">

          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.45, type: 'spring', stiffness: 200 }}
            className="w-24 h-24 rounded-3xl flex items-center justify-center"
            style={{
              background: `${CYAN}0d`,
              border: `1px solid ${CYAN}30`,
              backdropFilter: 'blur(20px)',
              boxShadow: `0 0 40px ${CYAN}18`,
            }}
          >
            <USBTLogo className="w-14 h-14" />
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="text-center"
          >
            <h1
              className="text-3xl font-bold mb-2 tracking-tight"
              style={{
                background: `linear-gradient(135deg, #fff 0%, ${CYAN} 60%, #0077b6 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              USBT Exchange
            </h1>
            <p className="text-sm" style={{ color: `${CYAN}99` }}>
              Your trusted Tron DeFi wallet
            </p>
          </motion.div>

          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.22 }}
            className="flex items-center gap-2"
          >
            <TokenBadge symbol="USBT" color={CYAN} />
            <TokenBadge symbol="USDT" color="#22d3ee" />
            <TokenBadge symbol="TRX" color="#f472b6" />
          </motion.div>

          <motion.p
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.28 }}
            className="text-sm text-center leading-relaxed max-w-[280px]"
            style={{ color: 'rgba(255,255,255,0.45)', fontFamily: "'Inter', sans-serif" }}
          >
            The next-generation TRC-20 stablecoin. Swap, send, and earn yield — with near-zero fees and 2-second confirmations.
          </motion.p>

          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.34 }}
            className="flex items-center gap-2 flex-wrap justify-center"
          >
            {FEATURES.map(({ icon: Icon, title }) => (
              <div
                key={title}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{
                  background: `${CYAN}08`,
                  border: `1px solid ${CYAN}20`,
                  backdropFilter: 'blur(12px)',
                }}
              >
                <Icon size={11} style={{ color: CYAN }} />
                <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  {title.split(' ')[0]}
                </span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* CTA buttons */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.42 }}
          className="relative px-6 pb-10 space-y-3"
        >
          <button
            onClick={() => setShowModal(true)}
            className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            style={{
              background: CYAN,
              color: '#000',
              boxShadow: `0 0 28px ${CYAN}45`,
            }}
          >
            Connect Wallet
            <ArrowRight size={18} />
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="w-full py-4 rounded-2xl font-semibold text-base active:scale-[0.98] transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${CYAN}28`,
              color: 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(12px)',
            }}
          >
            I already have a wallet
          </button>
        </motion.div>
      </div>

      {/* ════════════════════════════════════════
          DESKTOP  (≥ md)
      ════════════════════════════════════════ */}
      <div
        className="hidden md:flex min-h-screen relative overflow-hidden"
        style={{ background: BG_DESKTOP }}
      >
        <ElectricGrid cols={16} rows={9} cell={80} color={CYAN} className="opacity-10" />

        {/* Depth vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 60% 80% at 30% 50%, ${CYAN}0a 0%, transparent 70%)` }}
        />
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-transparent to-[#080c14]/70" />

        {/* Ambient glow left */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '50%', left: '15%', transform: 'translate(-50%,-50%)',
            width: 500, height: 500, borderRadius: '50%',
            background: `${CYAN}06`, filter: 'blur(90px)',
          }}
        />

        {/* ── Left: Hero copy ── */}
        <div className="flex-1 flex flex-col justify-center px-14 xl:px-24 py-16 relative z-10 max-w-2xl">

          {/* Brand mark */}
          <motion.div
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3 mb-14"
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{
                background: `${CYAN}12`,
                border: `1px solid ${CYAN}35`,
                boxShadow: `0 0 18px ${CYAN}18`,
              }}
            >
              <USBTLogo className="w-7 h-7" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">USBT Exchange</span>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider"
              style={{
                background: `${CYAN}0d`,
                border: `1px solid ${CYAN}28`,
                color: CYAN,
              }}
            >
              Tron
            </span>
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.55, delay: 0.1 }}
          >
            <h1 className="text-5xl xl:text-6xl font-bold leading-[1.05] mb-5 tracking-tight">
              <span className="text-white">The Future of</span>
              <br />
              <span
                style={{
                  background: `linear-gradient(135deg, ${CYAN} 0%, #00b4d8 50%, #0077b6 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Tron DeFi
              </span>
            </h1>
            <p
              className="text-lg leading-relaxed max-w-md mb-10"
              style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif" }}
            >
              USBT is a next-generation TRC-20 stablecoin built for speed, security, and DeFi yield.
              Swap, send, and earn — all in one non-custodial wallet.
            </p>
          </motion.div>

          {/* Feature list */}
          <motion.div
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.55, delay: 0.18 }}
            className="space-y-5 mb-12"
          >
            {FEATURES.map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}
                  style={{ boxShadow: `0 0 14px ${CYAN}20` }}
                >
                  <Icon size={18} className="text-black" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm leading-none mb-1">{title}</p>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: 'rgba(255,255,255,0.38)', fontFamily: "'Inter', sans-serif" }}
                  >
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.55, delay: 0.26 }}
            className="flex items-center gap-10"
          >
            {STATS.map(({ value, label }) => (
              <div key={label}>
                <p className="font-bold text-2xl" style={{ color: CYAN }}>{value}</p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: 'rgba(255,255,255,0.32)', fontFamily: "'Inter', sans-serif" }}
                >
                  {label}
                </p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* ── Right: Connect card ── */}
        <div className="w-[460px] xl:w-[520px] flex items-center justify-center px-10 py-16 relative z-10">
          <motion.div
            initial={{ x: 32, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.55, delay: 0.2 }}
            className="w-full max-w-sm"
          >
            {/* Glass card */}
            <div
              className="rounded-3xl overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${CYAN}18`,
                backdropFilter: 'blur(28px)',
                boxShadow: `0 0 60px ${CYAN}08, inset 0 0 40px rgba(0,0,0,0.2)`,
              }}
            >
              {/* Card header */}
              <div
                className="px-8 pt-8 pb-7 flex flex-col items-center text-center"
                style={{
                  background: `linear-gradient(135deg, ${CYAN}10 0%, #0077b60a 100%)`,
                  borderBottom: `1px solid ${CYAN}12`,
                }}
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                  style={{
                    background: `${CYAN}10`,
                    border: `1px solid ${CYAN}28`,
                    boxShadow: `0 0 22px ${CYAN}18`,
                  }}
                >
                  <USBTLogo className="w-10 h-10" />
                </div>
                <h2 className="text-white text-2xl font-bold leading-tight">Connect Wallet</h2>
                <p className="text-sm mt-1" style={{ color: `${CYAN}80` }}>
                  Access your USBT portfolio
                </p>
              </div>

              {/* Card body */}
              <div className="px-8 py-7">
                <div className="flex items-center justify-center gap-2 mb-6">
                  <span
                    className="text-xs mr-1"
                    style={{ color: 'rgba(255,255,255,0.28)', fontFamily: "'Inter', sans-serif" }}
                  >
                    Supported:
                  </span>
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-bold"
                    style={{ background: `${CYAN}12`, color: CYAN, border: `1px solid ${CYAN}28` }}
                  >
                    USBT
                  </span>
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-bold"
                    style={{ background: 'rgba(34,211,238,0.08)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.22)' }}
                  >
                    USDT
                  </span>
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-bold"
                    style={{ background: 'rgba(244,114,182,0.08)', color: '#f472b6', border: '1px solid rgba(244,114,182,0.22)' }}
                  >
                    TRX
                  </span>
                </div>

                <button
                  onClick={() => setShowModal(true)}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-semibold text-sm text-white transition-all active:scale-[0.98] hover:opacity-90"
                  style={{
                    background: 'rgba(0,229,255,0.10)',
                    border: '1px solid rgba(0,229,255,0.22)',
                  }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
                  </svg>
                  Connect Wallet
                </button>

                <p
                  className="text-[11px] text-center mt-5 leading-relaxed"
                  style={{ color: 'rgba(255,255,255,0.22)', fontFamily: "'Inter', sans-serif" }}
                >
                  By connecting you agree to our{' '}
                  <span className="cursor-pointer hover:underline" style={{ color: CYAN }}>Terms</span>
                  {' & '}
                  <span className="cursor-pointer hover:underline" style={{ color: CYAN }}>Privacy Policy</span>
                </p>
              </div>
            </div>

            <p className="text-center text-xs mt-5" style={{ color: `${CYAN}40` }}>
              Non-custodial · Open source · Tron network
            </p>
          </motion.div>
        </div>
      </div>

      <WalletModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  )
}
