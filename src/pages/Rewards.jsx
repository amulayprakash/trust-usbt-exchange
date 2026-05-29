import { Gift, Lock } from 'lucide-react'

export default function Rewards() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 p-8 min-h-[500px] text-center">
      <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-5">
        <Gift size={36} className="text-[#3375BB]" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Rewards Coming Soon</h2>
      <p className="text-sm text-gray-500 max-w-xs">
        Earn rewards by holding USBT and participating in the Tron DeFi ecosystem.
      </p>
      <div className="mt-8 w-full space-y-3">
        {['USBT Staking', 'Liquidity Mining', 'Referral Program'].map((item) => (
          <div key={item} className="flex items-center gap-3 p-4 bg-gray-200 rounded-2xl opacity-50">
            <Lock size={18} className="text-gray-500" />
            <span className="text-sm font-semibold text-gray-700">{item}</span>
            <span className="ml-auto text-xs font-semibold text-gray-500 bg-gray-300 px-2 py-0.5 rounded-full">Soon</span>
          </div>
        ))}
      </div>
    </div>
  )
}
