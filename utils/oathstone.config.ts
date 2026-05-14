export const oathstoneConfig = {
  networks: {
    celo: {
      environment: 0, // 0 for testnet, 1 for mainnet
      rpcUrl: {
        testnet: 'https://forno.celo-sepolia.celo-testnet.org',
        mainnet: 'https://forno.celo.org'
      },
      tokens: {
        USD: {
          contractAddress: '0xd0A1B537e1012F3ec148c8ccf108ab4A687820C9',
          symbol: 'USD',
          abi: [
            {
              inputs: [{ internalType: 'address', name: '', type: 'address' }],
              name: 'balanceOf',
              outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
              stateMutability: 'view',
              type: 'function'
            },
            {
              inputs: [
                { internalType: 'address', name: '_to', type: 'address' },
                { internalType: 'uint256', name: '_amount', type: 'uint256' }
              ],
              name: 'transfer',
              outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }],
              stateMutability: 'nonpayable',
              type: 'function'
            }
          ]
        }
      }
    }
  }
};
