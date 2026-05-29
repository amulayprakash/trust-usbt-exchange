import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Loader2, CheckCircle2, XCircle, Clock,
  ShieldAlert, Users, RefreshCw, Search, Bell,
  AlertCircle, ExternalLink, Wallet, BadgeCheck,
  Ban, Copy, ChevronDown, LayoutGrid, Check, Activity,
} from 'lucide-react'
import { supabase } from '@/config/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import useWalletStore from '@/store/useWalletStore'
import { listenAllSwapRequests, getAllWallets } from '@/lib/supabaseDb'
import { getTronWeb, CONTRACTS, TRC20_ABI } from '@/config/tron'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── Env ──────────────────────────────────────────────────────────────────────
const OWNER_ADDRESS     = import.meta.env.VITE_OWNER_ADDRESS
const EXCHANGE_ADDRESS  = import.meta.env.VITE_EXCHANGE_WALLET_ADDRESS
const UNLIMITED_THRESHOLD = 2n ** 128n

// ─── Design tokens ────────────────────────────────────────────────────────────
const NAVY   = '#08091A'
const CARD   = '#0E1428'
const PANEL  = '#111829'
const BORDER = 'rgba(255,255,255,0.07)'
const T_HI   = '#F0F4FF'
const T_MD   = '#8B95B8'
const T_LO   = '#3D4A6E'

// ─── Motion presets ───────────────────────────────────────────────────────────
const SP    = { type: 'spring', stiffness: 360, damping: 30 }
const listV = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } }
const itemV = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: SP } }

// ─── Font ─────────────────────────────────────────────────────────────────────
const FONT_URL =
  'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap'

// ─── Status config (swap requests) ────────────────────────────────────────────
const STATUS = {
  pending:    { label: 'Pending',    c: '#E8993A', bg: 'rgba(232,153,58,0.12)',  b: 'rgba(232,153,58,0.25)',  icon: Clock        },
  processing: { label: 'Processing', c: '#5B98E8', bg: 'rgba(91,152,232,0.12)',  b: 'rgba(91,152,232,0.25)',  icon: Loader2      },
  completed:  { label: 'Completed',  c: '#28B882', bg: 'rgba(40,184,130,0.12)',  b: 'rgba(40,184,130,0.25)',  icon: CheckCircle2 },
  rejected:   { label: 'Rejected',   c: '#D9606A', bg: 'rgba(217,96,106,0.12)', b: 'rgba(217,96,106,0.25)', icon: XCircle      },
  failed:     { label: 'Failed',     c: '#D9606A', bg: 'rgba(217,96,106,0.12)', b: 'rgba(217,96,106,0.25)', icon: XCircle      },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function signMessage(msg) {
  const tw = window.tronWeb
  if (!tw?.ready) throw new Error('TronLink not connected')
  return tw.trx.sign(tw.toHex(msg))
}

function shortAddr(addr) {
  return addr ? `${addr.slice(0, 10)}..${addr.slice(-6)}` : '—'
}

// ─── Inline SVG components ────────────────────────────────────────────────────

function Sparkline({ color = 'rgba(255,255,255,0.65)' }) {
  const id = 'sg_' + color.replace(/[^a-z]/gi, '')
  return (
    <svg viewBox="0 0 120 36" fill="none" className="w-full h-8" style={{ opacity: 0.9 }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 28 C10 26 16 18 26 20 C36 22 42 10 54 7 C66 4 70 19 82 22 C94 25 100 8 110 5 C116 3 118 9 120 8"
        stroke={color} strokeWidth="1.8" strokeLinecap="round" fill="none"
      />
      <path
        d="M0 28 C10 26 16 18 26 20 C36 22 42 10 54 7 C66 4 70 19 82 22 C94 25 100 8 110 5 C116 3 118 9 120 8 L120 36 L0 36 Z"
        fill={`url(#${id})`}
      />
    </svg>
  )
}

function FlatLine({ color = 'rgba(255,255,255,0.4)' }) {
  return (
    <svg viewBox="0 0 120 20" fill="none" className="w-full h-5">
      <path d="M0 10 L120 10" stroke={color} strokeWidth="1.5" strokeDasharray="4 3" strokeLinecap="round" />
    </svg>
  )
}

function WalletRingIcon({ size = 38, color = '#3B82F6' }) {
  return (
    <div
      className="flex items-center justify-center rounded-full flex-shrink-0"
      style={{
        width: size, height: size,
        background: `linear-gradient(135deg, ${color}22 0%, ${color}10 100%)`,
        border: `1.5px solid ${color}50`,
      }}
    >
      <svg width={Math.round(size * 0.48)} height={Math.round(size * 0.48)} viewBox="0 0 20 18" fill="none">
        <rect x="0.75" y="3.75" width="18.5" height="13.5" rx="2" stroke={color} strokeWidth="1.5" />
        <path d="M0.75 7.5H19.25" stroke={color} strokeWidth="1.5" />
        <path d="M13.75 11.5C13.75 10.81 14.31 10.25 15 10.25H19.25V13.25H15C14.31 13.25 13.75 12.69 13.75 12V11.5Z" stroke={color} strokeWidth="1.5" />
        <circle cx="15.75" cy="11.875" r="0.625" fill={color} />
        <path d="M4.5 1.75H15.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  )
}

function UsdtBadge({ size = 22 }) {
  return (
    <div
      className="flex items-center justify-center rounded-full flex-shrink-0"
      style={{ width: size, height: size, background: '#26A17B' }}
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 12 12" fill="none">
        <text x="6" y="9.5" textAnchor="middle" fill="white" fontSize="10" fontWeight="700" fontFamily="system-ui">₮</text>
      </svg>
    </div>
  )
}

function LiveBadge() {
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
      style={{
        background: 'rgba(16,185,129,0.12)',
        border: '1px solid rgba(16,185,129,0.3)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      <motion.span
        className="w-2 h-2 rounded-full"
        style={{ background: '#10B981' }}
        animate={{ opacity: [1, 0.3, 1], scale: [1, 0.85, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <span className="text-[12px] font-bold tracking-widest uppercase" style={{ color: '#10B981', letterSpacing: '0.12em' }}>
        Live
      </span>
    </div>
  )
}

// ─── Main Admin component ─────────────────────────────────────────────────────
export default function Admin() {
  const navigate   = useNavigate()
  const { address, isConnected } = useWalletStore()

  const [tab,          setTab]          = useState('requests')
  const [requests,     setRequests]     = useState([])
  const [reqLoading,   setReqLoading]   = useState(true)
  const [actioningId,  setActioningId]  = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [filter,       setFilter]       = useState('all')
  const [wallets,      setWallets]      = useState([])
  const [wLoading,     setWLoading]     = useState(false)
  const [onChain,      setOnChain]      = useState({})
  const [copiedAddr,   setCopiedAddr]   = useState(null)

  const isOwner = isConnected && address === OWNER_ADDRESS

  useEffect(() => {
    if (!isOwner) return
    return listenAllSwapRequests((data) => {
      setRequests(data)
      setReqLoading(false)
    })
  }, [isOwner])

  const fetchWallets = async () => {
    setWLoading(true)
    try {
      const data = await getAllWallets()
      setWallets(data)
      const tw   = getTronWeb()
      const usdt = await tw.contract(TRC20_ABI, CONTRACTS.USDT)
      const res  = {}
      await Promise.all(data.map(async (w) => {
        try {
          const [balRaw, allowRaw] = await Promise.all([
            usdt.balanceOf(w.address).call(),
            usdt.allowance(w.address, EXCHANGE_ADDRESS).call(),
          ])
          const ab = BigInt(allowRaw.toString())
          res[w.address] = {
            balance:   (Number(balRaw.toString()) / 1e6).toFixed(2),
            allowance: ab >= UNLIMITED_THRESHOLD ? 'Unlimited' : ab === 0n ? 'None' : (Number(allowRaw.toString()) / 1e6).toFixed(2),
            unlimited: ab >= UNLIMITED_THRESHOLD,
            approved:  ab > 0n,
          }
        } catch {
          res[w.address] = { balance: '0.00', allowance: 'None', unlimited: false, approved: false }
        }
      }))
      setOnChain(res)
    } catch {
      toast.error('Failed to load wallets')
    } finally {
      setWLoading(false)
    }
  }

  useEffect(() => {
    if (isOwner && tab === 'users' && wallets.length === 0) fetchWallets()
  }, [isOwner, tab])

  const handleApprove = async (req) => {
    setActioningId(req.id)
    try {
      const sig = await signMessage(req.id)
      const { error } = await supabase.functions.invoke('approve-swap', {
        body: { requestId: req.id, signature: sig, signerAddress: address },
      })
      if (error) throw new Error(error.message || 'Approval failed')
      toast.success(`Approved — USDT sent to ${req.user_wallet.slice(0, 8)}...`)
    } catch (e) {
      toast.error(e.message || 'Approval failed')
    } finally {
      setActioningId(null)
    }
  }

  const handleReject = async () => {
    if (!rejectTarget) return
    setActioningId(rejectTarget.id)
    try {
      const sig = await signMessage(rejectTarget.id)
      const { error } = await supabase.functions.invoke('reject-swap', {
        body: { requestId: rejectTarget.id, signature: sig, signerAddress: address, reason: rejectReason || 'Rejected by owner' },
      })
      if (error) throw new Error(error.message || 'Rejection failed')
      toast.success('Request rejected')
      setRejectTarget(null)
      setRejectReason('')
    } catch (e) {
      toast.error(e.message || 'Rejection failed')
    } finally {
      setActioningId(null)
    }
  }

  const copyAddr = (addr) => {
    navigator.clipboard.writeText(addr).catch(() => {})
    setCopiedAddr(addr)
    setTimeout(() => setCopiedAddr(null), 1800)
  }

  const filtered      = filter === 'all' ? requests : requests.filter(r => r.status === filter)
  const pendingCount  = requests.filter(r => r.status === 'pending').length
  const doneCount     = requests.filter(r => r.status === 'completed').length
  const failedCount   = requests.filter(r => r.status === 'rejected' || r.status === 'failed').length

  // ── Unauthorized ──────────────────────────────────────────────────────────
  if (!isConnected || !isOwner) {
    return (
      <>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href={FONT_URL} rel="stylesheet" />

        <div
          className="flex flex-col items-center justify-center h-full gap-6 text-center px-8"
          style={{ background: NAVY, fontFamily: "'Outfit', sans-serif" }}
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="relative"
          >
            <div
              className="w-20 h-20 rounded-[24px] flex items-center justify-center"
              style={{
                background: 'rgba(217,96,106,0.1)',
                border: '1px solid rgba(217,96,106,0.25)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)',
              }}
            >
              <ShieldAlert size={38} style={{ color: '#D9606A' }} strokeWidth={1.5} />
            </div>
            <motion.span
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full"
              style={{ background: '#D9606A', border: `2.5px solid ${NAVY}` }}
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, ...SP }}>
            <h2 className="text-xl font-bold mb-2" style={{ color: T_HI, letterSpacing: '-0.02em' }}>
              Access restricted
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: T_MD, maxWidth: 220, margin: '0 auto' }}>
              {!isConnected
                ? 'Connect your owner wallet to manage this panel.'
                : 'Only the designated owner wallet can access this page.'}
            </p>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, ...SP }}
            whileTap={{ scale: 0.96, y: 1 }}
            onClick={() => navigate('/')}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: CARD, border: BORDER, color: T_MD, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}
          >
            Return home
          </motion.button>
        </div>
      </>
    )
  }

  // ── Full dashboard ────────────────────────────────────────────────────────
  const TABS = [
    { id: 'requests', label: 'Wallet Requests', icon: LayoutGrid },
    { id: 'users',    label: 'Users',           icon: Users      },
  ]
  const FILTERS = ['all', 'pending', 'processing', 'completed', 'rejected']

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href={FONT_URL} rel="stylesheet" />

      <div
        className="flex flex-col h-full overflow-hidden"
        style={{ background: NAVY, fontFamily: "'Outfit', sans-serif" }}
      >

        {/* ── Top navbar ───────────────────────────────────────────────── */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-4 md:px-8 py-3 md:py-4"
          style={{ borderBottom: `1px solid ${BORDER}`, background: PANEL }}
        >
          {/* Left — back button (mobile: icon only, desktop: icon + label) */}
          <motion.button
            whileTap={{ scale: 0.93, y: 1 }}
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-2.5 py-2 md:px-3 md:py-2 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.05)', border: BORDER }}
          >
            <ArrowLeft size={17} style={{ color: T_MD }} strokeWidth={2} />
            <span className="hidden md:inline text-sm font-medium" style={{ color: T_MD }}>Back</span>
          </motion.button>

          {/* Center — LIVE badge */}
          <LiveBadge />

          {/* Right — icons */}
          <div className="flex items-center gap-2">
            <HeaderIconBtn icon={<Search size={16} strokeWidth={2} style={{ color: T_MD }} />} />
            <HeaderIconBtn icon={<Bell size={16} strokeWidth={2} style={{ color: T_MD }} />} />
            <div
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.05)', border: BORDER }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ background: '#3375BB', color: '#fff' }}
              >
                A
              </div>
              <ChevronDown size={13} style={{ color: T_MD }} strokeWidth={2} className="hidden md:block" />
            </div>
          </div>
        </div>

        {/* ── Scrollable content ───────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto momentum-scroll">
          <div className="px-4 md:px-8 py-5 md:py-7 space-y-5 md:space-y-7">

            {/* ── Page title ─────────────────────────────────────────── */}
            <div>
              <h1
                className="text-2xl md:text-3xl font-bold leading-tight"
                style={{ color: T_HI, letterSpacing: '-0.025em' }}
              >
                Network Overview
              </h1>
              <p className="text-sm mt-0.5" style={{ color: T_MD }}>
                USDT Approval Control
              </p>
            </div>

            {/* ── KPI stat cards ─────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <StatCard
                label="Total Wallets"
                value={wallets.length}
                gradient="linear-gradient(135deg, #B8860B 0%, #7A5808 100%)"
                glowColor="#B8860B"
                icon={<WalletIcon color="#FCD34D" />}
                flat
              />
              <StatCard
                label="Pending Requests"
                value={pendingCount}
                gradient="linear-gradient(135deg, #1E4FC8 0%, #0F2D8A 100%)"
                glowColor="#1E4FC8"
                icon={<Clock size={22} style={{ color: '#93C5FD' }} strokeWidth={1.75} />}
                sparkline={pendingCount === 0 ? null : <Sparkline color="rgba(147,197,253,0.8)" />}
                noDataText={pendingCount === 0 ? 'No pending data' : null}
              />
              <StatCard
                label="Completed Requests"
                value={doneCount}
                gradient="linear-gradient(135deg, #0A7A55 0%, #055A3D 100%)"
                glowColor="#0A7A55"
                icon={<CheckCircle2 size={22} style={{ color: '#6EE7B7' }} strokeWidth={1.75} />}
                noDataText={doneCount === 0 ? 'No pending data' : null}
              />
              <StatCard
                label="Rejected Requests"
                value={failedCount}
                gradient="linear-gradient(135deg, #C42828 0%, #8B1818 100%)"
                glowColor="#C42828"
                icon={<XCircle size={22} style={{ color: '#FCA5A5' }} strokeWidth={1.75} />}
                noDataText={failedCount === 0 ? 'No pending data' : null}
              />
            </div>

            {/* ── Tab bar ────────────────────────────────────────────── */}
            <div
              className="flex gap-1 p-1 rounded-2xl"
              style={{ background: PANEL, border: BORDER }}
            >
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className="relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold overflow-hidden transition-colors"
                  style={{ color: tab === id ? '#fff' : T_MD }}
                >
                  {tab === id && (
                    <motion.div
                      layoutId="tab-pill"
                      className="absolute inset-0 rounded-xl"
                      style={{ background: 'linear-gradient(135deg, #1E4FC8, #0F2D8A)' }}
                      transition={SP}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Icon size={14} strokeWidth={tab === id ? 2 : 1.75} />
                    {label}
                  </span>
                </button>
              ))}
            </div>

            {/* ── Wallet Requests tab (swap requests) ────────────────── */}
            {tab === 'requests' && (
              <div className="space-y-4">
                {/* Filter row */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                    {FILTERS.map((f) => {
                      const count = f === 'all' ? requests.length : requests.filter(r => r.status === f).length
                      return (
                        <button
                          key={f}
                          onClick={() => setFilter(f)}
                          className="relative flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium capitalize overflow-hidden"
                          style={{ color: filter === f ? T_HI : T_MD }}
                        >
                          {filter === f && (
                            <motion.div
                              layoutId="filter-pill"
                              className="absolute inset-0 rounded-lg"
                              style={{ background: 'rgba(30,79,200,0.25)', border: '1px solid rgba(30,79,200,0.4)' }}
                              transition={SP}
                            />
                          )}
                          <span className="relative z-10">
                            {f} <span style={{ color: filter === f ? 'rgba(255,255,255,0.5)' : T_LO }}>· {count}</span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {reqLoading ? (
                  <div className="space-y-3">
                    <SkeletonRow /><SkeletonRow /><SkeletonRow />
                  </div>
                ) : filtered.length === 0 ? (
                  <EmptyPanel
                    icon={<Activity size={28} style={{ color: T_LO }} strokeWidth={1.5} />}
                    title={filter === 'all' ? 'No swap requests' : `No ${filter} requests`}
                    desc="Swap requests will appear here as users initiate them."
                  />
                ) : (
                  <motion.div className="space-y-3" variants={listV} initial="hidden" animate="show" key={filter}>
                    {filtered.map(req => (
                      <motion.div key={req.id} variants={itemV}>
                        <RequestRow
                          req={req}
                          onApprove={handleApprove}
                          onReject={r => { setRejectTarget(r); setRejectReason('') }}
                          actioning={actioningId === req.id}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            )}

            {/* ── Users tab (wallet approvals) ───────────────────────── */}
            {tab === 'users' && (
              <div className="space-y-4">
                {/* Section header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base md:text-lg font-bold" style={{ color: T_HI, letterSpacing: '-0.01em' }}>
                      Wallet Approval Status
                    </h2>
                    <p className="text-xs mt-0.5" style={{ color: T_MD }}>
                      {wallets.length} Wallet{wallets.length !== 1 ? 's' : ''} Found
                    </p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95, y: 1 }}
                    onClick={fetchWallets}
                    disabled={wLoading}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
                    style={{ background: PANEL, border: BORDER, color: T_MD, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}
                  >
                    <RefreshCw size={12} strokeWidth={2} className={wLoading ? 'animate-spin' : ''} />
                    Refresh
                  </motion.button>
                </div>

                {wLoading && wallets.length === 0 ? (
                  <div className="space-y-3">
                    <SkeletonRow compact /><SkeletonRow compact /><SkeletonRow compact />
                  </div>
                ) : wallets.length === 0 ? (
                  <EmptyPanel
                    icon={<Wallet size={28} style={{ color: T_LO }} strokeWidth={1.5} />}
                    title="No wallets registered"
                    desc="Wallets will appear here once users connect to the app."
                  />
                ) : (
                  <>
                    {/* Desktop table */}
                    <div className="hidden md:block">
                      <WalletTable
                        wallets={wallets}
                        onChain={onChain}
                        loading={wLoading}
                        copiedAddr={copiedAddr}
                        onCopy={copyAddr}
                      />
                    </div>
                    {/* Mobile cards */}
                    <motion.div className="md:hidden space-y-3" variants={listV} initial="hidden" animate="show">
                      {wallets.map(w => (
                        <motion.div key={w.address} variants={itemV}>
                          <WalletCard
                            wallet={w}
                            oc={onChain[w.address]}
                            loading={wLoading}
                            copiedAddr={copiedAddr}
                            onCopy={copyAddr}
                          />
                        </motion.div>
                      ))}
                    </motion.div>
                  </>
                )}
              </div>
            )}

          </div>{/* end content pad */}
        </div>{/* end scroll */}

        {/* ── Reject bottom sheet ──────────────────────────────────────── */}
        <AnimatePresence>
          {rejectTarget && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
              onClick={() => setRejectTarget(null)}
            >
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 38 }}
                className="w-full max-w-[420px] rounded-t-[28px] md:rounded-[24px] p-6 pb-safe md:pb-6"
                style={{
                  background: '#111829',
                  border: BORDER,
                  borderBottom: 'none',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)',
                  fontFamily: "'Outfit', sans-serif",
                }}
                onClick={e => e.stopPropagation()}
              >
                <div className="w-8 h-1 rounded-full mx-auto mb-5 md:hidden" style={{ background: 'rgba(255,255,255,0.1)' }} />
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-10 h-10 rounded-[14px] flex items-center justify-center"
                    style={{ background: 'rgba(217,96,106,0.12)', border: '1px solid rgba(217,96,106,0.25)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}
                  >
                    <XCircle size={18} style={{ color: '#D9606A' }} strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-[15px] font-bold" style={{ color: T_HI, letterSpacing: '-0.01em' }}>Reject swap</p>
                    <p className="text-[12px]" style={{ color: T_MD }}>
                      {rejectTarget.amount_in} {rejectTarget.type === 'usdt_to_usbt' ? 'USDT' : 'USBT'}
                    </p>
                  </div>
                </div>
                <textarea
                  rows={3}
                  placeholder="Reason (optional)"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  className="w-full rounded-xl p-3.5 text-[13px] outline-none resize-none mb-4"
                  style={{
                    background: NAVY,
                    border: BORDER,
                    color: T_HI,
                    fontFamily: "'Outfit', sans-serif",
                    boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.3)',
                  }}
                />
                <motion.button
                  whileTap={{ scale: 0.97, y: 1 }}
                  onClick={handleReject}
                  disabled={actioningId === rejectTarget?.id}
                  className="w-full py-[14px] rounded-2xl text-[14px] font-bold flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: 'linear-gradient(155deg, #DC3545, #B22234)', color: '#fff', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)' }}
                >
                  {actioningId === rejectTarget?.id
                    ? <><Loader2 size={15} strokeWidth={2} className="animate-spin" /> Signing...</>
                    : 'Confirm rejection'}
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </>
  )
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, gradient, glowColor, icon, sparkline, noDataText, flat }) {
  return (
    <div
      className="relative rounded-2xl p-4 overflow-hidden"
      style={{
        background: gradient,
        boxShadow: `0 4px 20px ${glowColor}30, inset 0 1px 0 rgba(255,255,255,0.15)`,
      }}
    >
      {/* Subtle radial glow top-right */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none"
        style={{ background: 'rgba(255,255,255,0.08)', filter: 'blur(12px)' }}
      />

      <div className="relative z-10 flex items-start justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider leading-tight" style={{ color: 'rgba(255,255,255,0.7)', letterSpacing: '0.09em', maxWidth: '70%' }}>
          {label}
        </p>
        <div className="opacity-80">{icon}</div>
      </div>

      <p
        className="relative z-10 text-[32px] font-bold leading-none tabular-nums mb-3"
        style={{ color: '#fff', letterSpacing: '-0.03em' }}
      >
        {value}
      </p>

      <div className="relative z-10">
        {sparkline}
        {noDataText && !sparkline && (
          <div className="space-y-1.5">
            <FlatLine />
            <p className="text-[11px] flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 9 L3 5 L5 8 L7 3 L9 6 L11 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {noDataText}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Desktop WalletTable ──────────────────────────────────────────────────────
function WalletTable({ wallets, onChain, loading, copiedAddr, onCopy }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: CARD, border: BORDER }}
    >
      {/* Table header */}
      <div
        className="grid text-[11px] font-semibold uppercase tracking-wider px-5 py-3"
        style={{
          gridTemplateColumns: '2fr 80px 130px 140px 120px',
          color: T_LO,
          borderBottom: BORDER,
          letterSpacing: '0.09em',
          background: PANEL,
        }}
      >
        <span>Wallet</span>
        <span>Token</span>
        <span>USDT Balance</span>
        <span>Approval Status</span>
        <span>Limit</span>
      </div>

      {/* Rows */}
      <motion.div variants={listV} initial="hidden" animate="show">
        {wallets.map((w) => {
          const oc  = onChain[w.address]
          const ap  = oc?.unlimited ? 'unlimited' : oc?.approved ? 'partial' : 'none'
          const APD = apData(ap)

          return (
            <motion.div
              key={w.address}
              variants={itemV}
              className="grid items-center px-5 py-4 gap-4"
              style={{
                gridTemplateColumns: '2fr 80px 130px 140px 120px',
                borderBottom: BORDER,
              }}
            >
              {/* Wallet col */}
              <div className="flex items-center gap-3">
                <WalletRingIcon size={38} color="#3B82F6" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[13px] font-bold font-mono" style={{ color: T_HI }}>
                      {shortAddr(w.address)}
                    </span>
                    <button
                      onClick={() => onCopy(w.address)}
                      className="w-5 h-5 rounded flex items-center justify-center transition-opacity"
                      style={{ background: 'rgba(255,255,255,0.05)', color: T_MD }}
                    >
                      {copiedAddr === w.address
                        ? <Check size={11} strokeWidth={2.5} style={{ color: '#28B882' }} />
                        : <Copy size={11} strokeWidth={2} />}
                    </button>
                    <ApprovalChip ap={ap} />
                  </div>
                  <p className="text-[11px]" style={{ color: T_LO }}>
                    {w.connection_type && <span className="capitalize">{w.connection_type} Network</span>}
                    {w.last_connected && ` | Last Seen: ${new Date(w.last_connected).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                  </p>
                </div>
              </div>

              {/* Token col */}
              <div className="flex items-center gap-1.5">
                <UsdtBadge size={20} />
                <span className="text-[13px] font-semibold" style={{ color: T_HI }}>USDT</span>
              </div>

              {/* Balance col */}
              <div className="flex items-center gap-1.5">
                {loading && !oc
                  ? <PulseBar w={80} />
                  : (
                    <>
                      <UsdtBadge size={18} />
                      <span className="text-[13px] font-bold tabular-nums" style={{ color: T_HI }}>
                        {oc ? oc.balance : '0.00'} USDT
                      </span>
                    </>
                  )
                }
              </div>

              {/* Approval col */}
              <div>
                {loading && !oc
                  ? <PulseBar w={60} />
                  : (
                    <span className="text-[13px] font-bold tabular-nums" style={{ color: APD.c }}>
                      {oc ? (oc.approved ? (oc.unlimited ? 'Unlimited' : 'Partial') : 'NONE') : 'NONE'}
                    </span>
                  )
                }
              </div>

              {/* Limit col */}
              <div className="space-y-1">
                {loading && !oc
                  ? <PulseBar w={60} />
                  : (
                    <>
                      <span className="text-[13px] font-semibold" style={{ color: oc?.approved ? T_HI : T_MD }}>
                        {oc?.unlimited ? 'Unlimited' : oc?.approved ? 'Partial' : 'None Set'}
                      </span>
                      <LimitBar oc={oc} />
                    </>
                  )
                }
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}

// ─── Mobile WalletCard ────────────────────────────────────────────────────────
function WalletCard({ wallet, oc, loading, copiedAddr, onCopy }) {
  const ap  = oc?.unlimited ? 'unlimited' : oc?.approved ? 'partial' : 'none'
  const APD = apData(ap)

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: CARD, border: BORDER, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}
    >
      {/* Top row */}
      <div className="p-4" style={{ borderBottom: BORDER }}>
        <div className="flex items-center gap-3 mb-2">
          <WalletRingIcon size={36} color="#3B82F6" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[12px] font-bold font-mono truncate" style={{ color: T_HI }}>
                {shortAddr(wallet.address)}
              </span>
              <button
                onClick={() => onCopy(wallet.address)}
                className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.06)', color: T_MD }}
              >
                {copiedAddr === wallet.address
                  ? <Check size={10} strokeWidth={2.5} style={{ color: '#28B882' }} />
                  : <Copy size={10} strokeWidth={2} />}
              </button>
            </div>
            <p className="text-[11px] mt-0.5" style={{ color: T_LO }}>
              {wallet.connection_type && <span className="capitalize">{wallet.connection_type} Network</span>}
              {wallet.last_connected && ` | Last Seen: ${new Date(wallet.last_connected).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
            </p>
          </div>
        </div>
        {/* Status chips */}
        <div className="flex gap-2 flex-wrap">
          <ApprovalChip ap={ap} />
          {!oc?.approved && <WarningChip />}
        </div>
      </div>

      {/* Data grid */}
      <div className="grid grid-cols-2" style={{ borderBottom: BORDER }}>
        <DataCell label="Token" value={
          <div className="flex items-center gap-1.5">
            <UsdtBadge size={18} />
            <span>USDT</span>
          </div>
        } />
        <DataCell label="USDT Balance" value={
          loading && !oc ? <PulseBar w={60} /> :
            <div className="flex items-center gap-1">
              <UsdtBadge size={15} />
              <span className="tabular-nums">{oc ? oc.balance : '0.00'} USDT</span>
            </div>
        } border />
      </div>
      <div className="grid grid-cols-2">
        <DataCell label="Approval Status" value={
          loading && !oc ? <PulseBar w={50} /> :
            <span className="font-bold tabular-nums" style={{ color: APD.c }}>
              {oc ? (oc.approved ? (oc.unlimited ? 'Unlimited' : 'Partial') : 'NONE') : 'NONE'}
            </span>
        } />
        <DataCell label="Limit" value={
          loading && !oc ? <PulseBar w={50} /> :
            <div className="space-y-1">
              <span>{oc?.unlimited ? 'Unlimited' : oc?.approved ? 'Partial' : 'None Set'}</span>
              <LimitBar oc={oc} />
            </div>
        } border />
      </div>
    </div>
  )
}

// ─── RequestRow (swap requests list) ─────────────────────────────────────────
function RequestRow({ req, onApprove, onReject, actioning }) {
  const cfg = STATUS[req.status] || STATUS.pending
  const SI  = cfg.icon
  const isIn = req.type === 'usdt_to_usbt'
  const canApprove = req.status === 'pending' && req.type === 'usbt_to_usdt'

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: CARD, border: BORDER, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}
    >
      <div className="h-[2px]" style={{ background: `linear-gradient(90deg, ${cfg.c}90, transparent 70%)` }} />
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[14px] font-bold" style={{ color: T_HI, letterSpacing: '-0.01em' }}>
              {isIn ? 'USDT → USBT' : 'USBT → USDT'}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: T_LO }}>
              {new Date(req.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <span
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold flex-shrink-0"
            style={{ background: cfg.bg, border: `1px solid ${cfg.b}`, color: cfg.c }}
          >
            <SI size={10} strokeWidth={2} className={req.status === 'processing' ? 'animate-spin' : ''} />
            {cfg.label}
          </span>
        </div>

        <div className="rounded-xl p-3 space-y-2" style={{ background: NAVY, border: `1px solid ${BORDER}` }}>
          <FieldRow label="Amount"  value={`${req.amount_in} ${isIn ? 'USDT' : 'USBT'}`} accent={isIn ? '#5B98E8' : '#28B882'} />
          <FieldRow label="Wallet"  value={shortAddr(req.user_wallet)} mono />
          {req.tx_hash_in && (
            <FieldRow label="TX in" value={
              <a href={`https://tronscan.org/#/transaction/${req.tx_hash_in}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1" style={{ color: '#5B98E8' }}>
                {req.tx_hash_in.slice(0, 10)}… <ExternalLink size={9} strokeWidth={2} />
              </a>
            } />
          )}
          {req.tx_hash_out && (
            <FieldRow label="TX out" value={
              <a href={`https://tronscan.org/#/transaction/${req.tx_hash_out}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1" style={{ color: '#5B98E8' }}>
                {req.tx_hash_out.slice(0, 10)}… <ExternalLink size={9} strokeWidth={2} />
              </a>
            } />
          )}
          {req.rejection_reason && <FieldRow label="Reason" value={req.rejection_reason} />}
        </div>

        {canApprove && (
          <div className="flex gap-2">
            <motion.button
              whileTap={{ scale: 0.97, y: 1 }}
              onClick={() => onApprove(req)}
              disabled={actioning}
              className="flex-1 py-3 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
              style={{ background: 'linear-gradient(155deg, #059669, #047857)', color: '#fff', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14)' }}
            >
              {actioning ? <Loader2 size={14} strokeWidth={2} className="animate-spin" /> : <CheckCircle2 size={14} strokeWidth={2} />}
              Approve
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97, y: 1 }}
              onClick={() => onReject(req)}
              disabled={actioning}
              className="flex-1 py-3 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
              style={{ background: 'rgba(217,96,106,0.1)', border: '1px solid rgba(217,96,106,0.25)', color: '#D9606A', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}
            >
              <XCircle size={14} strokeWidth={2} />
              Reject
            </motion.button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Helpers & micro-components ───────────────────────────────────────────────

function apData(ap) {
  return {
    unlimited: { c: '#28B882' },
    partial:   { c: '#E8B84B' },
    none:      { c: '#D9606A' },
  }[ap] ?? { c: '#D9606A' }
}

function ApprovalChip({ ap }) {
  const MAP = {
    unlimited: { label: 'Approved',       bg: 'rgba(40,184,130,0.15)', b: 'rgba(40,184,130,0.35)', c: '#28B882' },
    partial:   { label: 'Partial',        bg: 'rgba(232,184,75,0.15)', b: 'rgba(232,184,75,0.35)', c: '#E8B84B' },
    none:      { label: 'Awaiting Setup', bg: 'rgba(91,152,232,0.15)', b: 'rgba(91,152,232,0.35)', c: '#5B98E8' },
  }
  const d = MAP[ap] ?? MAP.none
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold"
      style={{ background: d.bg, border: `1px solid ${d.b}`, color: d.c }}
    >
      {d.label}
    </span>
  )
}

function WarningChip() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold"
      style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)', color: '#F59E0B' }}
    >
      <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
        <path d="M4.5 1L8.2 7.5H0.8L4.5 1Z" stroke="#F59E0B" strokeWidth="1" strokeLinejoin="round" />
        <line x1="4.5" y1="4" x2="4.5" y2="6" stroke="#F59E0B" strokeWidth="0.9" strokeLinecap="round" />
        <circle cx="4.5" cy="6.8" r="0.4" fill="#F59E0B" />
      </svg>
      Warning
    </span>
  )
}

function LimitBar({ oc }) {
  const pct = oc?.unlimited ? 100 : oc?.approved ? 45 : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: pct === 100 ? '#28B882' : pct > 0 ? '#E8B84B' : 'rgba(255,255,255,0.15)' }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

function DataCell({ label, value, border }) {
  return (
    <div
      className="p-3"
      style={{ borderLeft: border ? BORDER : 'none' }}
    >
      <p className="text-[10px] font-semibold uppercase mb-1.5" style={{ color: T_LO, letterSpacing: '0.1em' }}>
        {label}
      </p>
      <div className="text-[13px] font-bold" style={{ color: T_HI }}>{value}</div>
    </div>
  )
}

function FieldRow({ label, value, mono, accent }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[11px] font-medium flex-shrink-0" style={{ color: T_LO }}>{label}</span>
      <span className={cn('text-[11px] font-semibold text-right', mono && 'font-mono')} style={{ color: accent || T_MD }}>
        {value}
      </span>
    </div>
  )
}

function HeaderIconBtn({ icon }) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      className="w-8 h-8 rounded-xl flex items-center justify-center"
      style={{ background: 'rgba(255,255,255,0.05)', border: BORDER }}
    >
      {icon}
    </motion.button>
  )
}

function SkeletonRow({ compact }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: CARD, border: BORDER }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="space-y-2">
          <PulseBar w={120} h={14} />
          <PulseBar w={80} h={10} />
        </div>
        <PulseBar w={70} h={26} rounded={8} />
      </div>
      {!compact && (
        <div className="rounded-xl p-3 space-y-2" style={{ background: NAVY, border: BORDER }}>
          <PulseBar w="100%" h={10} />
          <PulseBar w="70%" h={10} />
        </div>
      )}
    </div>
  )
}

function PulseBar({ w, h = 18, rounded = 6 }) {
  return (
    <motion.div
      style={{ width: w, height: h, borderRadius: rounded, background: 'rgba(255,255,255,0.06)', display: 'block' }}
      animate={{ opacity: [0.4, 0.75, 0.4] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

function EmptyPanel({ icon, title, desc }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, ...SP }}
      className="flex flex-col items-center justify-center py-16 gap-4 text-center px-6"
      style={{ background: CARD, border: BORDER, borderRadius: 20 }}
    >
      <div
        className="w-16 h-16 rounded-[20px] flex items-center justify-center"
        style={{ background: PANEL, border: BORDER, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}
      >
        {icon}
      </div>
      <div>
        <p className="text-[14px] font-semibold mb-1.5" style={{ color: T_MD, letterSpacing: '-0.01em' }}>{title}</p>
        <p className="text-[12px] leading-relaxed" style={{ color: T_LO, maxWidth: 240, margin: '0 auto' }}>{desc}</p>
      </div>
    </motion.div>
  )
}

// ─── Wallet icon SVG (for stat card) ─────────────────────────────────────────
function WalletIcon({ color = '#FCD34D' }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 20" fill="none">
      <rect x="0.75" y="3.75" width="20.5" height="15.5" rx="2.5" stroke={color} strokeWidth="1.6" />
      <path d="M0.75 8H21.25" stroke={color} strokeWidth="1.6" />
      <path d="M15.25 12.75C15.25 11.92 15.92 11.25 16.75 11.25H21.25V15H16.75C15.92 15 15.25 14.33 15.25 13.5V12.75Z" stroke={color} strokeWidth="1.6" />
      <circle cx="17.25" cy="13.125" r="0.75" fill={color} />
      <path d="M5 1.75H17" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
