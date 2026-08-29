import { AnderPark } from './components/AnderPark';
import { AwayReportModal } from './components/AwayReportModal';
import { CharacterDetailModal } from './components/CharacterDetailModal';
import { DailyLogModal } from './components/DailyLogModal';
import { DecorationActionModal } from './components/DecorationActionModal';
import { FriendsModal } from './components/FriendsModal';
import { GamesModal } from './components/GamesModal';
import { HyenaDefenseGame } from './components/HyenaDefenseGame';
import { MemorialModal } from './components/MemorialModal';
import { NeedHud } from './components/NeedHud';
import { OnboardingModal } from './components/OnboardingModal';
import { RoomModal } from './components/RoomModal';
import { ScoreboardModal } from './components/ScoreboardModal';
import { ShareModal } from './components/ShareModal';
import { ShopModal } from './components/ShopModal';
import { StreakBadge } from './components/StreakBadge';
import { getTheme } from './data/themes';
import { displayStreak } from './data/streak';
import { useCharacter } from './hooks/useCharacter';
import { useColorMode } from './hooks/useColorMode';
import { useFriends } from './hooks/useFriends';
import { useGameProgress } from './hooks/useGameProgress';
import { useNeedNotifications } from './hooks/useNeedNotifications';
import { usePark } from './hooks/usePark';
import { useEffect, useRef, useState } from 'react';
import type { NeedType } from './types';

const MIN_ZOOM = 0.55;
const MAX_ZOOM = 1.3;
const ZOOM_STEP = 0.15;

function App() {
  const {
    coins,
    instances,
    ownedOutfitIds,
    equippedOutfitId,
    ownedThemeIds,
    activeThemeId,
    parkExpansionTier,
    earnCoins,
    buyNew,
    upgradeInstance,
    sellInstance,
    toggleLock,
    moveDecoration,
    buyOutfit,
    equipOutfit,
    buyTheme,
    setActiveTheme,
    buyParkExpansion,
    addRoomFurniture,
    moveRoomFurniture,
  } = usePark();
  const {
    character,
    deceased,
    dismissMemorial,
    awayReport,
    dismissAwayReport,
    createCharacter,
    resetCharacter,
    updateCharacter,
    activateNeed,
    completeTask,
    addCustomTask,
    leveledUp,
    dismissLevelUp,
  } = useCharacter(earnCoins);
  const { colorMode, toggleColorMode } = useColorMode();
  useNeedNotifications(character);
  const friends = useFriends();
  const gameProgress = useGameProgress();
  const hyenaProgress = gameProgress.getEntry('hyena-defense');

  const [detailOpen, setDetailOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [dailyLogOpen, setDailyLogOpen] = useState(false);
  const [gamesOpen, setGamesOpen] = useState(false);
  const [scoreboardOpen, setScoreboardOpen] = useState(false);
  const [playingHyenaDefense, setPlayingHyenaDefense] = useState(false);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [roomInstanceId, setRoomInstanceId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [celebrateInstanceId, setCelebrateInstanceId] = useState<string | null>(null);
  const celebrateTimeout = useRef<number | undefined>(undefined);

  // Struggle-drain removes coins fractionally; round once here for display
  // and affordability checks (the stored value keeps its precision).
  const displayCoins = Math.round(coins);

  const ownedCountByLine = instances.reduce<Record<string, number>>((acc, inst) => {
    acc[inst.lineId] = (acc[inst.lineId] ?? 0) + 1;
    return acc;
  }, {});
  const selectedInstance = instances.find((inst) => inst.id === selectedInstanceId) ?? null;
  const roomInstance = instances.find((inst) => inst.id === roomInstanceId) ?? null;
  const activeTheme = getTheme(activeThemeId) ?? getTheme('classic')!;
  const parkWidthPercent = 100 + parkExpansionTier * 50;

  // Keep the leaderboard current whenever the local character or Hyena
  // Defense best score changes.
  useEffect(() => {
    if (!character) return;
    friends.syncStats({
      nickname: character.nickname,
      appearanceId: character.appearanceId,
      level: character.level,
      streakCount: displayStreak(character.streak, new Date()).count,
      longestStreak: character.streak.longest,
      hyenaHighScore: hyenaProgress.bestScore,
      hyenaLevelReached: hyenaProgress.bestLevel,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    character?.nickname,
    character?.appearanceId,
    character?.level,
    character?.streak,
    hyenaProgress.bestScore,
    hyenaProgress.bestLevel,
  ]);

  useEffect(() => () => window.clearTimeout(celebrateTimeout.current), []);

  const handleReset = () => {
    resetCharacter();
    setDetailOpen(false);
  };

  // Land straight on the needs/tasks screen once the character exists —
  // there should be something to act on immediately, not an empty park.
  const handleCreate: typeof createCharacter = (...args) => {
    createCharacter(...args);
    setDetailOpen(true);
  };

  // Completing a task earns the character's need AND contributes to the shared park fund.
  // Returns the actual awarded amount (may be doubled by Lucky Task) so the UI can show it accurately.
  const handleCompleteTask = (needType: NeedType, taskId: string, note: string) => {
    const reward = completeTask(needType, taskId, note);
    if (reward > 0) earnCoins(reward);
    return reward;
  };

  const handleHyenaGameOver = (finalScore: number, finalLevel: number, fullReward: number) => {
    const result = gameProgress.recordRun('hyena-defense', finalScore, finalLevel, fullReward);
    if (result.coins > 0) earnCoins(result.coins);
    return result;
  };

  const handleBuy = (lineId: string) => {
    const newId = buyNew(lineId);
    if (newId) {
      setCelebrateInstanceId(newId);
      window.clearTimeout(celebrateTimeout.current);
      celebrateTimeout.current = window.setTimeout(() => setCelebrateInstanceId(null), 1600);
    }
  };

  return (
    <div className="h-dvh overflow-hidden">
      <AnderPark
        character={character}
        instances={instances}
        colorMode={colorMode}
        theme={activeTheme}
        zoom={zoom}
        parkWidthPercent={parkWidthPercent}
        celebrateInstanceId={celebrateInstanceId}
        equippedOutfitId={equippedOutfitId}
        onSelectCharacter={() => setDetailOpen(true)}
        onSelectInstance={setSelectedInstanceId}
        onMoveDecoration={moveDecoration}
      />

      <header className="fixed inset-x-0 top-0 z-10 flex items-center justify-between border-b border-white/20 bg-black/70 px-4 pb-3 backdrop-blur-sm [padding-top:calc(0.75rem+env(safe-area-inset-top))]">
        <div>
          <h1 className="font-mono text-xl font-bold tracking-wide text-white">ANDERPARK</h1>
          <p className="hidden font-mono text-[11px] text-white/60 sm:block">
            Turn your goals into needs. Keep them met to keep your character alive.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {character && <StreakBadge streak={character.streak} />}
          <button
            onClick={toggleColorMode}
            title="Toggle color"
            className="border border-white/60 bg-transparent px-3 py-2 font-mono text-xs font-bold text-white hover:bg-white/10"
          >
            {colorMode ? '◑ COLOR' : '◐ MONO'}
          </button>
          <button
            onClick={() => setFriendsOpen(true)}
            title="Friends"
            className="border border-white/60 bg-transparent px-3 py-2 text-white hover:bg-white/10"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8.5" cy="8" r="3" />
              <path d="M2.5 19c0-3.3 2.7-6 6-6s6 2.7 6 6" />
              <circle cx="17" cy="9" r="2.5" />
              <path d="M14.5 13.2c2.9.4 5 2.9 5 5.8" />
            </svg>
          </button>
          {character && (
            <button
              onClick={() => setDailyLogOpen(true)}
              title="Today's log"
              className="border border-white/60 bg-transparent px-3 py-2 text-white hover:bg-white/10"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="3" width="14" height="18" rx="2" />
                <path d="M9 8h6M9 12h6M9 16h3" />
              </svg>
            </button>
          )}
          <button
            onClick={() => setShopOpen(true)}
            className="border border-white/60 bg-transparent px-3 py-2 font-mono text-xs font-bold text-white hover:bg-white/10"
          >
            SHOP · {displayCoins}c
          </button>
        </div>
      </header>

      <div className="fixed bottom-20 right-3 z-10 flex flex-col overflow-hidden rounded-full border border-white/40 bg-black/70">
        <button
          onClick={() => setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)))}
          disabled={zoom >= MAX_ZOOM}
          title="Zoom in"
          className="px-3 py-2 font-mono text-sm font-bold text-white disabled:opacity-30"
        >
          +
        </button>
        <div className="h-px bg-white/30" />
        <button
          onClick={() => setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)))}
          disabled={zoom <= MIN_ZOOM}
          title="Zoom out"
          className="px-3 py-2 font-mono text-sm font-bold text-white disabled:opacity-30"
        >
          −
        </button>
      </div>

      {character && (
        <NeedHud character={character} onSelect={() => setDetailOpen(true)} onOpenGames={() => setGamesOpen(true)} />
      )}

      {!character && <OnboardingModal onCreate={handleCreate} />}

      {character && detailOpen && (
        <CharacterDetailModal
          character={character}
          onClose={() => setDetailOpen(false)}
          onCompleteTask={handleCompleteTask}
          onAddCustomTask={addCustomTask}
          onActivateNeed={activateNeed}
          onUpdateCharacter={updateCharacter}
          onReset={handleReset}
          onOpenDailyLog={() => setDailyLogOpen(true)}
        />
      )}

      {character && dailyLogOpen && (
        <DailyLogModal character={character} onClose={() => setDailyLogOpen(false)} />
      )}

      {shopOpen && (
        <ShopModal
          coins={displayCoins}
          characterLevel={character?.level ?? 1}
          ownedCountByLine={ownedCountByLine}
          colorMode={colorMode}
          onBuy={handleBuy}
          ownedOutfitIds={ownedOutfitIds}
          equippedOutfitId={equippedOutfitId}
          onBuyOutfit={buyOutfit}
          onEquipOutfit={equipOutfit}
          ownedThemeIds={ownedThemeIds}
          activeThemeId={activeThemeId}
          onBuyTheme={buyTheme}
          onSetActiveTheme={setActiveTheme}
          parkExpansionTier={parkExpansionTier}
          onBuyParkExpansion={buyParkExpansion}
          onClose={() => setShopOpen(false)}
        />
      )}

      {selectedInstance && (
        <DecorationActionModal
          instance={selectedInstance}
          coins={displayCoins}
          colorMode={colorMode}
          onUpgrade={() => upgradeInstance(selectedInstance.id)}
          onSell={() => {
            sellInstance(selectedInstance.id);
            setSelectedInstanceId(null);
          }}
          onToggleLock={() => toggleLock(selectedInstance.id)}
          onOpenRoom={() => {
            setRoomInstanceId(selectedInstance.id);
            setSelectedInstanceId(null);
          }}
          onClose={() => setSelectedInstanceId(null)}
        />
      )}

      {roomInstance && (
        <RoomModal
          instance={roomInstance}
          coins={displayCoins}
          colorMode={colorMode}
          onAddFurniture={(itemId) => addRoomFurniture(roomInstance.id, itemId)}
          onMoveFurniture={(furnitureId, left, bottom) => moveRoomFurniture(roomInstance.id, furnitureId, left, bottom)}
          onClose={() => setRoomInstanceId(null)}
        />
      )}

      {friendsOpen && <FriendsModal friends={friends} onClose={() => setFriendsOpen(false)} />}

      {gamesOpen && (
        <GamesModal
          onPlayHyenaDefense={() => {
            setGamesOpen(false);
            setPlayingHyenaDefense(true);
          }}
          onOpenScoreboard={() => {
            setGamesOpen(false);
            setScoreboardOpen(true);
          }}
          onClose={() => setGamesOpen(false)}
        />
      )}

      {playingHyenaDefense && character && (
        <HyenaDefenseGame
          appearanceId={character.appearanceId}
          colorMode={colorMode}
          progress={hyenaProgress}
          onExit={() => setPlayingHyenaDefense(false)}
          onGameOver={handleHyenaGameOver}
        />
      )}

      {scoreboardOpen && character && (
        <ScoreboardModal
          friends={friends}
          myNickname={character.nickname}
          myAppearanceId={character.appearanceId}
          myProgress={hyenaProgress}
          onClose={() => setScoreboardOpen(false)}
        />
      )}

      {character && leveledUp && <ShareModal character={character} onClose={dismissLevelUp} />}

      {deceased && <MemorialModal character={deceased} onClose={dismissMemorial} />}

      {character && awayReport && (
        <AwayReportModal character={character} report={awayReport} onClose={dismissAwayReport} />
      )}
    </div>
  );
}

export default App;
