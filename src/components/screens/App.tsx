import { useState } from 'react'
import { GameCanvas } from '#/components/game/GameCanvas'
import { useGame } from '#/game/useGame'
import { AchievementsDialog } from './AchievementsDialog'
import { DailyChallengeDialog } from './DailyChallengeDialog'
import { GameOver } from './GameOver'
import { Hud } from './Hud'
import { LeaderboardDialog } from './LeaderboardDialog'
import { MainMenu } from './MainMenu'
import { PauseMenu } from './PauseMenu'
import { SettingsDialog } from './SettingsDialog'
import { SkinsDialog } from './SkinsDialog'
import { ToastNotification } from './ToastNotification'

type Dialog = 'SKINS' | 'DAILY' | 'ACHIEVEMENTS' | 'LEADERBOARD' | 'SETTINGS'

export function App() {
  const game = useGame()
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const close = () => setDialog(null)

  return (
    <main className="relative w-full h-full min-h-[100dvh] overflow-hidden bg-[#06060c] select-none font-sans text-gray-100">
      <GameCanvas
        canvasRef={game.canvasRef}
        onJump={game.triggerJump}
        onSlide={game.triggerSlide}
        onStopSlide={game.triggerStopSlide}
        gameState={game.gameState}
      />

      {game.toastNotification && <ToastNotification toast={game.toastNotification} />}

      {game.gameState === 'MENU' && (
        <MainMenu
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
          onRotate={game.requestLandscapeMode}
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
        />
      )}

      {dialog === 'DAILY' && (
        <DailyChallengeDialog
          onClose={close}
          onClaimReward={(amount) =>
            game.showToast('Reward Claimed!', `+${amount} Shadow Orbs added to your bank!`, 'Coins')
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
      {dialog === 'LEADERBOARD' && <LeaderboardDialog onClose={close} />}
      {dialog === 'SETTINGS' && <SettingsDialog onClose={close} />}
    </main>
  )
}
