import { useEffect, useState, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ExternalLink } from 'lucide-react'
import useTronWallet from '@/hooks/useTronWallet'
import useWalletStore from '@/store/useWalletStore'

const WC_PROJECT_ID = import.meta.env.VITE_WC_PROJECT_ID

const DETECTABLE_WALLETS = [
  {
    name: 'OKX Wallet',
    wcName: 'OKX Wallet',
    detect: () => !!(window).okxwallet,
  },
  {
    name: 'Bitget Wallet',
    wcName: 'Bitget Wallet',
    detect: () => !!(window).bitkeep || !!(window).bitgetEthProvider,
  },
]

export default function WalletModal({ open, onClose }) {
  const { connectTronLink, connectWalletConnect } = useTronWallet()
  const { isConnected } = useWalletStore()
  const [tronLinkInstalled, setTronLinkInstalled] = useState(false)
  const [view, setView] = useState('all')
  const [wallets, setWallets] = useState([])
  const [search, setSearch] = useState('')
  const [loadingWallets, setLoadingWallets] = useState(false)
  const [selectedWallet, setSelectedWallet] = useState(null)
  const [detectedNames, setDetectedNames] = useState([])
  const [wcUri, setWcUri] = useState(null)
  const [wcConnecting, setWcConnecting] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState(null)
  const approvalStarted = useRef(false)

  useEffect(() => {
    setTronLinkInstalled(!!(window).tronWeb || !!(window).tronLink)
    if (open) {
      const detected = DETECTABLE_WALLETS.filter(w => {
        try { return w.detect() } catch { return false }
      }).map(w => w.name)
      setDetectedNames(detected)
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setView('all')
      setSearch('')
      setSelectedWallet(null)
      setWcUri(null)
      setError(null)
      setWcConnecting(false)
      setIsConnecting(false)
      approvalStarted.current = false
      return
    }
    if (wallets.length > 0) return
    setLoadingWallets(true)
    fetch(`https://explorer-api.walletconnect.com/v3/wallets?projectId=${WC_PROJECT_ID}&entries=100&page=1`)
      .then(r => r.json())
      .then(data => setWallets(Object.values(data.listings ?? {})))
      .catch(() => {})
      .finally(() => setLoadingWallets(false))
  }, [open])

  useEffect(() => {
    if (isConnected && open) onClose()
  }, [isConnected, open, onClose])

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const installedNameSet = useMemo(
    () => new Set(detectedNames.map(n => n.toLowerCase())),
    [detectedNames]
  )

  const installedWcWallets = useMemo(() =>
    detectedNames.map(name => ({
      name,
      wcWallet: wallets.find(w => w.name.toLowerCase() === name.toLowerCase()) ?? null,
    })),
  [detectedNames, wallets])

  const filtered = useMemo(() => {
    const base = !search.trim() ? wallets : wallets.filter(w =>
      w.name.toLowerCase().includes(search.toLowerCase())
    )
    return [...base].sort((a, b) => {
      const aIn = installedNameSet.has(a.name.toLowerCase()) ? 0 : 1
      const bIn = installedNameSet.has(b.name.toLowerCase()) ? 0 : 1
      return aIn - bIn
    })
  }, [wallets, search, installedNameSet])

  const getImgUrl = (w) => {
    if (typeof w.image_url === 'string') return w.image_url
    return w.image_url?.md ?? w.image_url?.sm ?? w.image_url?.lg
  }

  const getDeepLink = (w, uri) => {
    const encoded = encodeURIComponent(uri)
    if (w.mobile?.universal) return `${w.mobile.universal}/wc?uri=${encoded}`
    if (w.mobile?.native) return `${w.mobile.native}wc?uri=${encoded}`
    if (w.desktop?.native) return `${w.desktop.native}wc?uri=${encoded}`
    return '#'
  }

  const handleTronLink = async () => {
    setIsConnecting(true)
    setError(null)
    try {
      await connectTronLink()
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleWalletClick = async (wallet) => {
    if (approvalStarted.current) return
    approvalStarted.current = true
    setSelectedWallet(wallet)
    setWcConnecting(true)
    setView('connecting')
    try {
      await connectWalletConnect((uri) => {
        setWcUri(uri)
        setWcConnecting(false)
      })
    } catch (e) {
      approvalStarted.current = false
      setWcConnecting(false)
      setWcUri(null)
      setView('all')
      if (!e.message?.toLowerCase().includes('closed') && !e.message?.toLowerCase().includes('rejected')) {
        setError(e.message)
      }
    }
  }

  const closeBtn = (
    <button
      onClick={onClose}
      className="w-8 h-8 rounded-full flex items-center justify-center text-[#6b6b88] hover:text-white hover:bg-white/10 transition-all"
      aria-label="Close"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </button>
  )

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9980] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed inset-0 z-[9981] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-[370px] rounded-[28px] overflow-hidden flex flex-col"
              style={{ background: '#1c1c26', boxShadow: '0 40px 100px rgba(0,0,0,0.6)', maxHeight: '88vh' }}
              onClick={e => e.stopPropagation()}
            >
              <AnimatePresence mode="wait" initial={false}>

                {/* ── ALL WALLETS VIEW ─────────────────────────────── */}
                {view === 'all' && (
                  <motion.div
                    key="all"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.18 }}
                    className="flex flex-col overflow-hidden"
                    style={{ maxHeight: '88vh' }}
                  >
                    <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
                      <div className="w-8" />
                      <h2 className="text-[15px] font-semibold text-white tracking-tight">Connect Wallet</h2>
                      {closeBtn}
                    </div>

                    {/* TronLink row */}
                    <div className="px-3 pb-1 flex-shrink-0">
                      <WalletRow
                        icon={<TronLinkIcon />}
                        label="TronLink"
                        badge={tronLinkInstalled ? { text: 'INSTALLED', color: 'green' } : undefined}
                        loading={isConnecting}
                        onClick={handleTronLink}
                      />
                    </div>

                    {/* Other installed wallets (OKX, Bitget with Tron support) */}
                    {installedWcWallets.length > 0 && (
                      <div className="px-3 pb-2 flex-shrink-0">
                        {installedWcWallets.map(({ name, wcWallet }) => (
                          <WalletRow
                            key={name}
                            icon={
                              wcWallet ? (
                                <WcWalletIcon wallet={wcWallet} getImgUrl={getImgUrl} />
                              ) : (
                                <span className="text-white font-bold text-base">{name[0]}</span>
                              )
                            }
                            label={name}
                            badge={{ text: 'INSTALLED', color: 'green' }}
                            loading={wcConnecting && selectedWallet?.name === name}
                            onClick={() => handleWalletClick(wcWallet)}
                          />
                        ))}
                      </div>
                    )}

                    <div className="mx-5 mb-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />

                    {/* Search */}
                    <div className="px-4 pb-3 flex-shrink-0">
                      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-white/[0.06] border border-white/[0.08]">
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                          <circle cx="7" cy="7" r="5" stroke="#6b6b88" strokeWidth="1.5"/>
                          <path d="M11 11l2.5 2.5" stroke="#6b6b88" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        <input
                          type="text"
                          placeholder="Search 100+ wallets"
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          className="flex-1 bg-transparent text-[13px] text-white placeholder-[#6b6b88] outline-none"
                          autoFocus
                        />
                        {search && (
                          <button onClick={() => setSearch('')} className="text-[#6b6b88] hover:text-white transition-colors">
                            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Wallet grid */}
                    <div className="overflow-y-auto flex-1 px-3 pb-4">
                      {loadingWallets ? (
                        <div className="flex items-center justify-center h-52">
                          <span className="w-6 h-6 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-1">
                          {filtered.map(w => (
                            <WalletCard
                              key={w.id}
                              name={w.name}
                              imageUrl={getImgUrl(w)}
                              installed={installedNameSet.has(w.name.toLowerCase())}
                              loading={wcConnecting && selectedWallet?.id === w.id}
                              onClick={() => handleWalletClick(w)}
                            />
                          ))}
                          {filtered.length === 0 && !loadingWallets && (
                            <p className="col-span-3 text-center py-16 text-[13px] text-[#6b6b88]">
                              No wallets found for &ldquo;{search}&rdquo;
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {error && !error.toLowerCase().includes('closed') && (
                      <div className="mx-3 mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                        <p className="text-xs text-red-400 leading-relaxed">{error}</p>
                      </div>
                    )}

                    <div className="px-5 pt-2 pb-5 text-center flex-shrink-0">
                      <p className="text-[11px] text-[#3f3f52] leading-relaxed">
                        By connecting, you agree to our{' '}
                        <span className="text-cyan-500 cursor-pointer">Terms of Service</span>
                        {' '}and{' '}
                        <span className="text-cyan-500 cursor-pointer">Privacy Policy</span>
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* ── CONNECTING / QR VIEW ─────────────────────────── */}
                {view === 'connecting' && (
                  <motion.div
                    key="connecting"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.18 }}
                    className="flex flex-col"
                  >
                    <div className="flex items-center justify-between px-5 pt-5 pb-4">
                      <button
                        onClick={() => {
                          setView('all')
                          approvalStarted.current = false
                          setWcUri(null)
                          setWcConnecting(false)
                        }}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[#6b6b88] hover:text-white hover:bg-white/10 transition-all"
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <h2 className="text-[15px] font-semibold text-white tracking-tight">
                        {selectedWallet ? selectedWallet.name : 'WalletConnect'}
                      </h2>
                      {closeBtn}
                    </div>

                    <div className="px-5 pb-6">
                      <div className="flex flex-col items-center mb-5">
                        {selectedWallet ? (
                          <div
                            className="w-16 h-16 rounded-[20px] overflow-hidden mb-3 border border-white/[0.10]"
                            style={{ background: 'rgba(255,255,255,0.06)' }}
                          >
                            {getImgUrl(selectedWallet) ? (
                              <img src={getImgUrl(selectedWallet)} alt={selectedWallet.name}
                                className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                                {selectedWallet.name[0]}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            className="w-16 h-16 rounded-[20px] flex items-center justify-center mb-3"
                            style={{ background: 'rgba(59,153,252,0.12)', border: '1px solid rgba(59,153,252,0.25)' }}
                          >
                            <WCLogoLarge />
                          </div>
                        )}
                        <p className="text-sm text-[#9b9bb8] text-center">
                          {wcUri ? 'Scan with your wallet or open the app' : 'Creating session…'}
                        </p>
                      </div>

                      {wcUri ? (
                        <>
                          <div className="flex justify-center mb-4">
                            <div className="p-3 rounded-2xl bg-white">
                              <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(wcUri)}&bgcolor=ffffff&color=000000&margin=0`}
                                alt="WalletConnect QR"
                                width={200}
                                height={200}
                                className="rounded-lg block"
                              />
                            </div>
                          </div>

                          {selectedWallet && (getImgUrl(selectedWallet) || selectedWallet.mobile?.universal || selectedWallet.mobile?.native) && (
                            <a
                              href={getDeepLink(selectedWallet, wcUri)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl mb-3 text-sm font-semibold text-white transition-colors"
                              style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.30)' }}
                            >
                              Open {selectedWallet.name}
                              <ExternalLink size={14} />
                            </a>
                          )}

                          <CopyUriButton uri={wcUri} />
                        </>
                      ) : (
                        <div className="flex justify-center py-10">
                          <span className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

// ─── Copy URI button ──────────────────────────────────────────────────────────

function CopyUriButton({ uri }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(uri).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={copy}
      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-[13px] text-[#6b6b88] hover:text-white transition-colors"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M3 11V3a1 1 0 011-1h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
      {copied ? 'Copied!' : 'Copy link'}
    </button>
  )
}

// ─── Wallet Row ───────────────────────────────────────────────────────────────

function WalletRow({ icon, label, badge, loading, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-white/[0.06] transition-colors group text-left disabled:opacity-60 disabled:cursor-wait"
    >
      <span className="w-10 h-10 rounded-[14px] bg-white/[0.06] border border-white/[0.08] flex items-center justify-center flex-shrink-0 overflow-hidden">
        {loading
          ? <span className="w-4 h-4 rounded-full border-[1.5px] border-cyan-500 border-t-transparent animate-spin" />
          : icon}
      </span>
      <span className="flex-1 text-[15px] font-medium text-white">{label}</span>
      {badge && (
        <span className={`text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-md ${
          badge.color === 'green'
            ? 'text-green-400 bg-green-500/10 border border-green-500/20'
            : 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20'
        }`}>{badge.text}</span>
      )}
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[#3f3f52] group-hover:text-[#6b6b88] transition-colors flex-shrink-0">
        <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )
}

// ─── Wallet Card (grid) ───────────────────────────────────────────────────────

function WalletCard({ name, imageUrl, loading, installed, onClick }) {
  const short = name.length > 11 ? name.slice(0, 10) + '…' : name
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex flex-col items-center gap-2 py-3 px-2 rounded-2xl hover:bg-white/[0.06] transition-colors group disabled:opacity-60 disabled:cursor-wait"
    >
      <span className="relative w-[62px] h-[62px] rounded-[18px] bg-white/[0.06] border border-white/[0.06] flex items-center justify-center overflow-hidden flex-shrink-0">
        {loading ? (
          <span className="w-5 h-5 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
        ) : imageUrl ? (
          <img
            src={imageUrl} alt={name}
            className="w-full h-full object-cover"
            onError={e => { e.target.style.display = 'none' }}
          />
        ) : (
          <span className="text-white font-bold text-lg">{name[0]}</span>
        )}
        {installed && !loading && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-[#1c1c26]" />
        )}
      </span>
      <span className="text-[11px] text-[#9b9bb8] group-hover:text-white transition-colors text-center leading-tight">
        {short}
      </span>
    </button>
  )
}

// ─── WC Wallet Icon ───────────────────────────────────────────────────────────

function WcWalletIcon({ wallet, getImgUrl }) {
  const url = getImgUrl(wallet)
  return url ? (
    <img src={url} alt={wallet.name} className="w-full h-full object-cover"
      onError={e => { e.target.style.display = 'none' }} />
  ) : (
    <span className="text-white font-bold text-base">{wallet.name[0]}</span>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function TronLinkIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="#1a1a2e"/>
      <path d="M20 7L34 28H6L20 7Z" fill="#ef0027" fillOpacity="0.9"/>
      <path d="M20 7L34 28H20V7Z" fill="#ef0027"/>
      <circle cx="20" cy="26" r="5" fill="#ff4d4d" fillOpacity="0.3"/>
      <circle cx="20" cy="26" r="3" fill="#ff6b6b"/>
    </svg>
  )
}

function WCLogoLarge() {
  return (
    <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
      <path d="M9.2 16.4c5.96-5.83 15.63-5.83 21.6 0l.71.7a.73.73 0 010 1.04l-2.44 2.38a.38.38 0 01-.53 0l-.98-.96c-4.16-4.07-10.91-4.07-15.07 0l-1.05 1.02a.38.38 0 01-.53 0l-2.44-2.38a.73.73 0 010-1.04l.73-.76zm26.7 4.97l2.17 2.12a.73.73 0 010 1.04l-9.77 9.55a.77.77 0 01-1.06 0l-6.93-6.77a.19.19 0 00-.27 0l-6.93 6.77a.77.77 0 01-1.06 0L2.27 24.53a.73.73 0 010-1.04l2.17-2.12a.77.77 0 011.06 0l6.93 6.77c.07.07.2.07.27 0l6.93-6.77a.77.77 0 011.06 0l6.93 6.77c.07.07.2.07.27 0l6.93-6.77a.77.77 0 011.06 0z" fill="#3b99fc"/>
    </svg>
  )
}
