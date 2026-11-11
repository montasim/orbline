import { useEffect, useState } from 'react'
import { GameCanvas } from '#/components/game/GameCanvas'
import { useGame } from '#/game/useGame'
import { AchievementsDialog } from './AchievementsDialog'
import { DailyChallengeDialog } from './DailyChallengeDialog'
import { GameOver } from './GameOver'
import { Hud } from './Hud'
import { LeaderboardDialog } from './LeaderboardDialog'
import { MainMenu } from './MainMenu'
import { RegionsDialog } from './RegionsDialog'
import { PauseMenu } from './PauseMenu'
import { SettingsDialog } from './SettingsDialog'
import { SkinsDialog } from './SkinsDialog'
import { ToastNotification } from './ToastNotification'

type Dialog = 'SKINS' | 'DAILY' | 'ACHIEVEMENTS' | 'LEADERBOARD' | 'SETTINGS' | 'REGIONS'

export function App() {
  const game = useGame()
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const close = () => setDialog(null)
  // installable app: the service worker lets it open offline (production only, so dev never serves stale files)
  useEffect(() => {
    if (import.meta.env.PROD && 'serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])

  // fixed to the visible viewport the canvas measures; 100dvh could run under Android system bars
  return (
    <main className="fixed inset-0 overflow-hidden bg-night select-none font-sans text-ice">
      <GameCanvas
        canvasRef={game.canvasRef}
        onJump={game.triggerJump}
        onSlide={game.triggerSlide}
        onStopSlide={game.triggerStopSlide}
        gameState={game.gameState}
      />

      {game.toastNotification && <ToastNotification key={`${game.toastNotification.title}|${game.toastNotification.message}`} toast={game.toastNotification} inRun={game.gameState === 'PLAYING'} />}

      {/* title screen steps aside while a dialog is open, leaving just the scene behind it */}
      {game.gameState === 'MENU' && !dialog && (
        <MainMenu
          onOpenRegions={() => setDialog('REGIONS')}
          selectedMap={game.selectedMap}
          onStart={game.startGame}
          onOpenSkins={() => setDialog('SKINS')}
          onOpenDaily={() => setDialog('DAILY')}
          onOpenAchievements={() => setDialog('ACHIEVEMENTS')}
          onOpenLeaderboard={() => setDialog('LEADERBOARD')}
          onOpenSettings={() => setDialog('SETTINGS')}
          isPortrait={game.isPortrait}
          onRotate={game.requestLandscapeMode}
        />
      )}
      {game.gameState === 'PLAYING' && (
        <Hud
          scoreData={game.scoreData}
          powerupStatus={game.powerupStatus}
          onPause={game.togglePause}
          onJump={game.triggerJump}
          onSlide={game.triggerSlide}
          onStopSlide={game.triggerStopSlide}
          showToast={game.showToast}
          isPortrait={game.isPortrait}
        />
      )}
      {game.gameState === 'PAUSED' && (
        <PauseMenu onResume={game.togglePause} onRestart={game.restartGame} onMainMenu={game.goToMenu} />
      )}
      {game.gameState === 'GAMEOVER' && (
        <GameOver
          scoreData={game.scoreData}
          isNewHighScore={game.isNewHighScore}
          onRestart={game.restartGame}
          onMainMenu={game.goToMenu}
          onOpenSkins={() => setDialog('SKINS')}
          onOpenRanks={() => setDialog('LEADERBOARD')}
          onlineRun={game.onlineRun}
          onOpenSettings={() => setDialog('SETTINGS')}
        />
      )}

      {dialog === 'DAILY' && (
        <DailyChallengeDialog
          onClose={close}
          onClaimReward={(amount) =>
            game.showToast('Reward collected!', `+${amount} crystals added to your stash.`, 'Coins')
          }
        />
      )}
      {dialog === 'ACHIEVEMENTS' && <AchievementsDialog onClose={close} />}
      {dialog === 'SKINS' && (
        <SkinsDialog
          selectedSkin={game.selectedSkin}
          onSelectSkin={game.changeSkin}
          onClose={close}
          showToast={game.showToast}
        />
      )}
      {dialog === 'LEADERBOARD' && <LeaderboardDialog onClose={close} onOpenSettings={() => setDialog('SETTINGS')} />}
      {dialog === 'SETTINGS' && <SettingsDialog onClose={close} onNameSaved={game.submitPendingRun} />}
      {dialog === 'REGIONS' && (
        <RegionsDialog selectedMap={game.selectedMap} onSelect={game.changeMap} onClose={close} />
      )}
    </main>
  )
}
