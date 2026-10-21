import { useEffect, useState } from 'react'
import type { Hex } from 'viem'
import { useHotShotsWallet } from './hooks/useHotShotsWallet.ts'
import { WalletPanel } from './components/WalletPanel.tsx'
import { StakeConfirm, type LobbyInfo } from './components/StakeConfirm.tsx'
import { SettlementStatus } from './components/SettlementStatus.tsx'
import { env } from './lib/env.ts'

interface LobbyDto {
  matchId: Hex
  region: string
  capacity: number
  playerCount: number
  stakeWei: string
  admissionDeadline: string
  allowlistProof?: Hex[]
}

/**
 * Wallet + payment shell. The game client mounts its own screens around these three pieces:
 * WalletPanel (home/wallet), StakeConfirm (lobby entry), SettlementStatus (match end).
 * Lobby data comes from your LobbyService API; amounts are re-checked on-chain before deposit.
 */
export function App() {
  const w = useHotShotsWallet()
  const [lobby, setLobby] = useState<LobbyInfo | null>(null)
  const [joined, setJoined] = useState(false)
  const [usdPerEth, setUsd] = useState<number | null>(null)

  useEffect(() => {
    const id = new URLSearchParams(location.search).get('lobby')
    if (!id) return
    fetch(`${env.apiUrl}/lobbies/${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: LobbyDto | null) =>
        d &&
        setLobby({
          ...d,
          stakeWei: BigInt(d.stakeWei),
          admissionDeadline: new Date(d.admissionDeadline),
        }),
      )
      .catch(() => setLobby(null))
    fetch(`${env.apiUrl}/price/eth-usd`)
      .then((r) => (r.ok ? r.json() : null))
      .then((p: { usd: number } | null) => setUsd(p?.usd ?? null))
      .catch(() => setUsd(null))
  }, [])

  return (
    <main className="shell">
      <header>
        <h1>Hot Shots</h1>
      </header>
      <WalletPanel w={w} usdPerEth={usdPerEth} />
      {lobby && !joined && <StakeConfirm w={w} lobby={lobby} usdPerEth={usdPerEth} onJoined={() => setJoined(true)} />}
      {lobby && joined && <SettlementStatus w={w} matchId={lobby.matchId} />}
      {!lobby && <p className="muted">Open a lobby link (?lobby=…) to enter a match.</p>}
    </main>
  )
}
