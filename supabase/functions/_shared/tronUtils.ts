// @ts-ignore — npm: specifier resolved by Deno at runtime
import TronWeb from 'npm:tronweb'

const TRON_FULL_NODE = 'https://api.trongrid.io'

export const CONTRACTS: Record<string, string> = {
  USBT: 'TK9y3cDCtVBQEdjTUWw1iuPZZKTxnuFWrH',
  USDT: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
}

const DECIMALS: Record<string, number> = {
  USBT: 18,
  USDT: 6,
}

const TRC20_ABI = [
  {
    name: 'transfer',
    inputs: [{ name: '_to', type: 'address' }, { name: '_value', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
]

export function buildTronWeb(privateKey: string) {
  const apiKey = Deno.env.get('TRONGRID_API_KEY') || ''
  const opts: Record<string, unknown> = { fullHost: TRON_FULL_NODE, privateKey }
  if (apiKey) opts.headers = { 'TRON-PRO-API-KEY': apiKey }
  return new TronWeb(opts)
}

export async function verifyIncomingTx(
  txHash: string,
  expectedToken: string,
  expectedToAddress: string,
  expectedAmountStr: string,
) {
  const apiKey = Deno.env.get('TRONGRID_API_KEY') || ''
  const url = `${TRON_FULL_NODE}/v1/transactions/${txHash}`
  const headers: Record<string, string> = apiKey ? { 'TRON-PRO-API-KEY': apiKey } : {}
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error('Could not verify transaction on TronGrid')
  const json = await res.json()
  const tx = json.data?.[0]
  if (!tx) throw new Error('Transaction not found on-chain')

  const contract = tx.raw_data?.contract?.[0]
  if (contract?.type !== 'TriggerSmartContract')
    throw new Error('Transaction is not a TRC20 transfer')

  const contractAddress = TronWeb.address.fromHex(contract.parameter?.value?.contract_address)
  if (contractAddress !== expectedToken)
    throw new Error('Transaction is not for the expected token')

  const receiptResult = tx.ret?.[0]?.contractRet
  if (receiptResult !== 'SUCCESS')
    throw new Error('Transaction did not succeed on-chain')

  const data = contract.parameter?.value?.data
  if (!data || data.length < 136)
    throw new Error('Could not decode transfer data')

  const toHex = '41' + data.slice(32, 72)
  const toAddress = TronWeb.address.fromHex(toHex)
  if (toAddress !== expectedToAddress)
    throw new Error('Transaction recipient does not match exchange wallet')

  const amountHex = data.slice(72, 136)
  const amountBig = BigInt('0x' + amountHex)
  const decimals = expectedToken === CONTRACTS.USBT ? DECIMALS.USBT : DECIMALS.USDT
  const amountFloat = Number(amountBig) / Math.pow(10, decimals)

  const expectedAmount = parseFloat(expectedAmountStr)
  if (Math.abs(amountFloat - expectedAmount) / expectedAmount > 0.001)
    throw new Error(`Amount mismatch: on-chain ${amountFloat}, expected ${expectedAmount}`)
}

export async function sendTrc20(
  tronWeb: unknown,
  tokenSymbol: string,
  toAddress: string,
  amountStr: string,
): Promise<string> {
  const decimals = DECIMALS[tokenSymbol]
  const contractAddress = CONTRACTS[tokenSymbol]
  const amountBig = BigInt(Math.floor(parseFloat(amountStr) * Math.pow(10, decimals))).toString()
  // @ts-ignore
  const contract = await tronWeb.contract(TRC20_ABI, contractAddress)
  const txHash = await contract.transfer(toAddress, amountBig).send({
    feeLimit: 50_000_000,
    callValue: 0,
  })
  return txHash
}

export async function verifyOwnerSignature(
  tronWeb: unknown,
  requestId: string,
  signature: string,
  signerAddress: string,
  ownerAddress: string,
) {
  if (signerAddress !== ownerAddress)
    throw new Error('Signer is not the owner')

  // @ts-ignore
  const msgHex = tronWeb.toHex(requestId)
  // @ts-ignore
  const recovered = await tronWeb.trx.verifyMessageV2(msgHex, signature)
  if (recovered !== ownerAddress)
    throw new Error('Signature verification failed')
}
