import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PrivyProvider } from '@privy-io/react-auth'
import { chain, env } from './lib/env.ts'
import { App } from './App.tsx'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrivyProvider
      appId={env.privyAppId}
      clientId={env.privyClientId}
      config={{
        // Robinhood Chain only. Privy rejects switching wallets to any chain not listed here.
        defaultChain: chain,
        supportedChains: [chain],
        loginMethods: ['email', 'wallet', 'google'],
        embeddedWallets: {
          ethereum: { createOnLogin: 'users-without-wallets' },
          // Always show Privy's confirmation screen before an embedded wallet sends a deposit.
          showWalletUIs: true,
        },
        appearance: {
          theme: 'dark',
          accentColor: '#FF557D',
          walletChainType: 'ethereum-only',
          showWalletLoginFirst: false,
        },
      }}
    >
      <App />
    </PrivyProvider>
  </StrictMode>,
)
