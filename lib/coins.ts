export type CoinOption = {
  id: string;
  symbol: string;
  name: string;
};

export const CURATED_COINS: CoinOption[] = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  { id: 'tether', symbol: 'USDT', name: 'Tether' },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB' },
  { id: 'solana', symbol: 'SOL', name: 'Solana' },
  { id: 'usd-coin', symbol: 'USDC', name: 'USD Coin' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' },
  { id: 'the-open-network', symbol: 'TON', name: 'Toncoin' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
  { id: 'tron', symbol: 'TRX', name: 'TRON' },
  { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche' },
  { id: 'shiba-inu', symbol: 'SHIB', name: 'Shiba Inu' },
  { id: 'polkadot', symbol: 'DOT', name: 'Polkadot' },
  { id: 'chainlink', symbol: 'LINK', name: 'Chainlink' },
  { id: 'bitcoin-cash', symbol: 'BCH', name: 'Bitcoin Cash' },
  { id: 'near', symbol: 'NEAR', name: 'NEAR Protocol' },
  { id: 'litecoin', symbol: 'LTC', name: 'Litecoin' },
  { id: 'uniswap', symbol: 'UNI', name: 'Uniswap' },
  { id: 'cosmos', symbol: 'ATOM', name: 'Cosmos' },
  { id: 'pepe', symbol: 'PEPE', name: 'Pepe' },
  { id: 'monero', symbol: 'XMR', name: 'Monero' },
  { id: 'internet-computer', symbol: 'ICP', name: 'Internet Computer' },
  { id: 'aptos', symbol: 'APT', name: 'Aptos' },
  { id: 'filecoin', symbol: 'FIL', name: 'Filecoin' },
  { id: 'arbitrum', symbol: 'ARB', name: 'Arbitrum' },
  { id: 'optimism', symbol: 'OP', name: 'Optimism' },
  { id: 'hedera-hashgraph', symbol: 'HBAR', name: 'Hedera' },
  { id: 'vechain', symbol: 'VET', name: 'VeChain' },
  { id: 'maker', symbol: 'MKR', name: 'Maker' },
  { id: 'algorand', symbol: 'ALGO', name: 'Algorand' },
  { id: 'aave', symbol: 'AAVE', name: 'Aave' },
  { id: 'render-token', symbol: 'RNDR', name: 'Render' },
  { id: 'stacks', symbol: 'STX', name: 'Stacks' },
  { id: 'stellar', symbol: 'XLM', name: 'Stellar' },
  { id: 'injective-protocol', symbol: 'INJ', name: 'Injective' },
  { id: 'the-graph', symbol: 'GRT', name: 'The Graph' },
  { id: 'the-sandbox', symbol: 'SAND', name: 'The Sandbox' },
  { id: 'decentraland', symbol: 'MANA', name: 'Decentraland' },
  { id: 'ethereum-name-service', symbol: 'ENS', name: 'ENS' },
  { id: '1inch', symbol: '1INCH', name: '1inch' },
  { id: 'zcash', symbol: 'ZEC', name: 'Zcash' },
  { id: 'compound-governance-token', symbol: 'COMP', name: 'Compound' },
  { id: 'lido-dao', symbol: 'LDO', name: 'Lido DAO' },
  { id: 'sushi', symbol: 'SUSHI', name: 'SushiSwap' },
  { id: 'yearn-finance', symbol: 'YFI', name: 'yearn.finance' },
  { id: 'synthetix-network-token', symbol: 'SNX', name: 'Synthetix' },
  { id: 'ocean-protocol', symbol: 'OCEAN', name: 'Ocean Protocol' },
  { id: 'chiliz', symbol: 'CHZ', name: 'Chiliz' },
  { id: 'iota', symbol: 'IOTA', name: 'IOTA' },
  { id: 'sui', symbol: 'SUI', name: 'Sui' },
  { id: 'sei-network', symbol: 'SEI', name: 'Sei' },
  { id: 'celestia', symbol: 'TIA', name: 'Celestia' },
  { id: 'blur', symbol: 'BLUR', name: 'Blur' },
  { id: 'floki', symbol: 'FLOKI', name: 'FLOKI' },
  { id: 'bonk', symbol: 'BONK', name: 'Bonk' },
  { id: 'worldcoin-wld', symbol: 'WLD', name: 'Worldcoin' },
  { id: 'pyth-network', symbol: 'PYTH', name: 'Pyth Network' },
  { id: 'jito-governance-token', symbol: 'JTO', name: 'Jito' },
  { id: 'wormhole', symbol: 'W', name: 'Wormhole' },
  { id: 'ethena', symbol: 'ENA', name: 'Ethena' },
];

export function searchCoins(query: string): CoinOption[] {
  if (!query.trim()) return [];
  const q = query.trim().toLowerCase();
  return CURATED_COINS.filter(
    (coin) =>
      coin.name.toLowerCase().includes(q) ||
      coin.symbol.toLowerCase().includes(q) ||
      coin.id.toLowerCase().includes(q)
  ).slice(0, 12);
}
