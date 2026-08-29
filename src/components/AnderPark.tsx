import { useMemo, useRef } from 'react';
import { getTier } from '../data/decorations';
import type { ParkTheme } from '../data/themes';
import type { DecorationInstance } from '../hooks/usePark';
import type { Character } from '../types';
import { CharacterSprite } from './CharacterSprite';
import {
  GRASS_MATRICES,
  grayHex,
  PixelCloud,
  pixelSpriteHeight,
  pixelSpriteWidth,
  PixelGrass,
  PixelSun,
  PixelTree,
  TREE_MATRICES,
} from './PixelDecor';
import { PlacedDecoration } from './PlacedDecoration';

interface Props {
  character: Character | null;
  instances: DecorationInstance[];
  colorMode: boolean;
  theme: ParkTheme;
  zoom: number;
  parkWidthPercent: number;
  celebrateInstanceId: string | null;
  equippedOutfitId: string | null;
  onSelectCharacter: () => void;
  onSelectInstance: (id: string) => void;
  onMoveDecoration: (id: string, left: number, bottom: number) => void;
}

// Derives a tree's palette from a stable per-tree seed, so a given tree keeps
// the same relative light/darkness whether you're in mono or color mode.
function treePalette(seed: number, colorMode: boolean) {
  if (!colorMode) {
    const canopyLightness = 110 + seed * 120;
    return { 1: grayHex(canopyLightness), 2: grayHex(canopyLightness - 70) };
  }
  const canopyL = 26 + seed * 32;
  const trunkL = Math.max(14, canopyL - 16);
  return { 1: `hsl(112, 40%, ${canopyL}%)`, 2: `hsl(28, 45%, ${trunkL}%)` };
}

function darken(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 255) - amount);
  const g = Math.max(0, ((n >> 8) & 255) - amount);
  const b = Math.max(0, (n & 255) - amount);
  return `rgb(${r}, ${g}, ${b})`;
}

export function AnderPark({
  character,
  instances,
  colorMode,
  theme,
  zoom,
  parkWidthPercent,
  celebrateInstanceId,
  equippedOutfitId,
  onSelectCharacter,
  onSelectInstance,
  onMoveDecoration,
}: Props) {
  const groundRef = useRef<HTMLDivElement>(null);
  const groundBase = colorMode ? theme.groundColor : theme.groundMono;
  const groundDark = darken(groundBase, 22);

  const treeSpots = useMemo(
    () =>
      [2, 14, 26, 38, 50, 62, 74, 86, 97].map((left) => ({
        left,
        size: 4 + Math.round(Math.random() * 8),
        bottom: 98 + Math.random() * 3,
        seed: Math.random(),
        variant: Math.floor(Math.random() * TREE_MATRICES.length),
        swayDuration: 3.5 + Math.random() * 3,
        swayDelay: -Math.random() * 6,
      })),
    [],
  );

  const cloudSpots = useMemo(
    () => [
      { left: 8, top: 16, size: 6, opacity: 0.8, duration: 22 + Math.random() * 10, delay: -Math.random() * 20 },
      { left: 70, top: 8, size: 5, opacity: 0.6, duration: 26 + Math.random() * 10, delay: -Math.random() * 20 },
      { left: 40, top: 22, size: 5, opacity: 0.5, duration: 30 + Math.random() * 10, delay: -Math.random() * 20 },
    ],
    [],
  );

  const buildingSpots = useMemo(
    () =>
      [1, 12, 24, 36, 48, 60, 72, 84, 94].map((left) => ({
        left,
        width: 8 + Math.round(Math.random() * 6),
        height: 40 + Math.round(Math.random() * 90),
        lit: Math.random() > 0.4,
      })),
    [],
  );

  const starSpots = useMemo(
    () =>
      Array.from({ length: 40 }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 70,
        size: 1 + Math.round(Math.random() * 2),
      })),
    [],
  );

  // Small grass tufts scattered through the foreground for a bit of ground texture.
  const grassSpots = useMemo(
    () =>
      Array.from({ length: 22 }, () => ({
        left: Math.random() * 100,
        bottom: 2 + Math.random() * 68,
        size: 3 + Math.round(Math.random() * 2),
        variant: Math.floor(Math.random() * GRASS_MATRICES.length),
        swayDuration: 1.6 + Math.random() * 1.4,
        swayDelay: -Math.random() * 3,
      })),
    [],
  );

  const skyBackground = colorMode ? theme.skyColor : theme.skyMono;

  return (
    <div
      className="fixed inset-0 overflow-auto overscroll-contain"
      style={{ touchAction: 'pan-x pan-y', background: skyBackground }}
    >
      <div
        className="relative overflow-hidden"
        style={{
          width: `${parkWidthPercent}%`,
          height: '100%',
          minWidth: '100%',
          minHeight: '100%',
          background: skyBackground,
          transform: `scale(${zoom})`,
          transformOrigin: 'bottom left',
        }}
      >
        {theme.decor === 'stars' ? (
          <>
            {starSpots.map((s, i) => (
              <span
                key={i}
                className="absolute rounded-full bg-white opacity-80"
                style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size }}
              />
            ))}
            <PixelSun size={9} color={colorMode ? '#e8e8f0' : undefined} className="absolute right-[10%] top-[10%]" />
          </>
        ) : (
          <>
            <PixelSun size={11} color={colorMode ? '#ffd54f' : undefined} className="absolute right-[10%] top-[10%]" />
            {cloudSpots.map((cloud, i) => (
              <div
                key={i}
                className="animate-cloud-drift absolute"
                style={{
                  left: `${cloud.left}%`,
                  top: `${cloud.top}%`,
                  opacity: cloud.opacity,
                  animationDuration: `${cloud.duration}s`,
                  animationDelay: `${cloud.delay}s`,
                }}
              >
                <PixelCloud size={cloud.size} color={colorMode ? '#ffffff' : undefined} />
              </div>
            ))}
          </>
        )}

        {/* ground */}
        <div
          ref={groundRef}
          className="absolute inset-x-0 bottom-0 h-[46%] border-t-2 border-black/60"
          style={{
            backgroundColor: groundBase,
            backgroundImage: `conic-gradient(${groundDark} 90deg, ${groundBase} 90deg 180deg, ${groundDark} 180deg 270deg, ${groundBase} 270deg)`,
            backgroundSize: '6px 6px',
          }}
        >
          {theme.decor === 'trees' &&
            treeSpots.map((tree, i) => {
              const treeMatrix = TREE_MATRICES[tree.variant];
              return (
                <div
                  key={i}
                  className="animate-tree-sway absolute opacity-90"
                  style={{
                    left: `${tree.left}%`,
                    bottom: `calc(${tree.bottom}% + ${pixelSpriteHeight(treeMatrix, tree.size)}px)`,
                    width: pixelSpriteWidth(treeMatrix, tree.size),
                    height: pixelSpriteHeight(treeMatrix, tree.size),
                    animationDuration: `${tree.swayDuration}s`,
                    animationDelay: `${tree.swayDelay}s`,
                  }}
                >
                  <PixelTree variant={tree.variant} size={tree.size} palette={treePalette(tree.seed, colorMode)} />
                </div>
              );
            })}

          {theme.decor === 'buildings' &&
            buildingSpots.map((b, i) => (
              <div
                key={i}
                className="absolute bottom-full border-2 border-black/70"
                style={{
                  left: `${b.left}%`,
                  width: `${b.width}%`,
                  height: b.height,
                  backgroundColor: colorMode ? (b.lit ? '#5a4a2a' : '#2a2a38') : '#4a4a52',
                }}
              />
            ))}

          {theme.decor === 'waves' && (
            <div
              className="absolute inset-x-0 top-0 h-2 opacity-70"
              style={{ backgroundColor: colorMode ? '#ffffff' : '#e8e8e8' }}
            />
          )}

          {grassSpots.map((tuft, i) => {
            const grassMatrix = GRASS_MATRICES[tuft.variant];
            return (
              <div
                key={i}
                className="animate-grass-sway absolute opacity-70"
                style={{
                  left: `${tuft.left}%`,
                  bottom: `calc(${tuft.bottom}% + ${pixelSpriteHeight(grassMatrix, tuft.size)}px)`,
                  width: pixelSpriteWidth(grassMatrix, tuft.size),
                  height: pixelSpriteHeight(grassMatrix, tuft.size),
                  animationDuration: `${tuft.swayDuration}s`,
                  animationDelay: `${tuft.swayDelay}s`,
                }}
              >
                <PixelGrass
                  variant={tuft.variant}
                  size={tuft.size}
                  color={colorMode ? (tuft.variant === 0 ? '#5fa84c' : '#4a8f3c') : undefined}
                />
              </div>
            );
          })}

          {instances.map((instance) => {
            const deco = getTier(instance.lineId, instance.tier);
            if (!deco) return null;
            return (
              <PlacedDecoration
                key={instance.id}
                deco={deco}
                position={{ left: instance.left, bottom: instance.bottom }}
                groundRef={groundRef}
                colorMode={colorMode}
                locked={instance.locked}
                celebrate={celebrateInstanceId === instance.id}
                onMove={(left, bottom) => onMoveDecoration(instance.id, left, bottom)}
                onTap={() => onSelectInstance(instance.id)}
              />
            );
          })}
        </div>

        {!character ? (
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <p className="border-2 border-white/70 bg-black px-4 py-3 text-center font-mono text-sm text-white">
              ANDERPARK IS EMPTY
              <br />
              Create your character to get started.
            </p>
          </div>
        ) : (
          <CharacterSprite
            character={character}
            colorMode={colorMode}
            instances={instances}
            equippedOutfitId={equippedOutfitId}
            onClick={onSelectCharacter}
          />
        )}
      </div>
    </div>
  );
}
