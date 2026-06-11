import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useEffect, useMemo, useRef } from 'react';

/* eslint-disable @typescript-eslint/no-require-imports */
const CLICK_SOURCES = [
  require('../../assets/sounds/click-01.wav'),
  require('../../assets/sounds/click-02.wav'),
  require('../../assets/sounds/click-03.wav'),
] as number[];
const RELEASE_SOURCE = require('../../assets/sounds/spring-release.wav') as number;
const WHOOSH_SOURCE = require('../../assets/sounds/twist-whoosh.wav') as number;
/* eslint-enable @typescript-eslint/no-require-imports */

/** Minimum gap between click sounds, to avoid a machine-gun effect. */
const CLICK_RATE_LIMIT_MS = 80;
/** Spin velocity (deg/frame) where the whoosh becomes audible. */
const WHOOSH_MIN_VEL = 5;
/** Spin velocity where the whoosh reaches full volume. */
const WHOOSH_MAX_VEL = 25;

export interface AudioEngine {
  /** Random metallic tap — extension crossed a threshold. */
  playClick(): void;
  /** Soft tone — joystick released while extended. */
  playRelease(): void;
  /** Continuous wind swish; volume follows twist velocity. 0 stops it. */
  setWhooshLevel(spinVelocity: number): void;
  /** Master switch, mirrors params.soundEnabled. */
  setEnabled(enabled: boolean): void;
}

/**
 * Preloads all sounds on mount and exposes imperative trigger functions.
 * These are the runOnJS targets of the physics-event reactions — keep them
 * cheap and synchronous.
 */
export function useAudioEngine(): AudioEngine {
  const clickPlayers = useRef<AudioPlayer[]>([]);
  const releasePlayer = useRef<AudioPlayer | null>(null);
  const whooshPlayer = useRef<AudioPlayer | null>(null);
  const enabled = useRef(true);
  const lastClickAt = useRef(0);
  const whooshActive = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await setAudioModeAsync({ playsInSilentMode: true });
      } catch {
        // Non-fatal — e.g. Web before first user gesture.
      }
      if (!alive) return;
      clickPlayers.current = CLICK_SOURCES.map((src) => createAudioPlayer(src));
      releasePlayer.current = createAudioPlayer(RELEASE_SOURCE);
      const whoosh = createAudioPlayer(WHOOSH_SOURCE);
      whoosh.loop = true;
      whoosh.volume = 0;
      whooshPlayer.current = whoosh;
    })();
    return () => {
      alive = false;
      for (const p of clickPlayers.current) p.remove();
      releasePlayer.current?.remove();
      whooshPlayer.current?.remove();
      clickPlayers.current = [];
      releasePlayer.current = null;
      whooshPlayer.current = null;
    };
  }, []);

  return useMemo<AudioEngine>(
    () => ({
      playClick() {
        if (!enabled.current) return;
        const now = Date.now();
        if (now - lastClickAt.current < CLICK_RATE_LIMIT_MS) return;
        lastClickAt.current = now;
        const players = clickPlayers.current;
        if (players.length === 0) return;
        const player = players[Math.floor(Math.random() * players.length)];
        try {
          void player.seekTo(0);
          player.play();
        } catch {
          // Player may not be ready yet — drop the sound.
        }
      },
      playRelease() {
        if (!enabled.current) return;
        const player = releasePlayer.current;
        if (!player) return;
        try {
          void player.seekTo(0);
          player.play();
        } catch {
          // Drop.
        }
      },
      setWhooshLevel(spinVelocity: number) {
        const player = whooshPlayer.current;
        if (!player) return;
        const speed = Math.abs(spinVelocity);
        const level =
          !enabled.current || speed < WHOOSH_MIN_VEL
            ? 0
            : Math.min(1, (speed - WHOOSH_MIN_VEL) / (WHOOSH_MAX_VEL - WHOOSH_MIN_VEL));
        try {
          player.volume = level * 0.7;
          if (level > 0 && !whooshActive.current) {
            player.play();
            whooshActive.current = true;
          } else if (level === 0 && whooshActive.current) {
            player.pause();
            whooshActive.current = false;
          }
        } catch {
          // Drop.
        }
      },
      setEnabled(value: boolean) {
        enabled.current = value;
        if (!value) {
          const whoosh = whooshPlayer.current;
          if (whoosh && whooshActive.current) {
            try {
              whoosh.pause();
            } catch {
              // Ignore.
            }
            whooshActive.current = false;
          }
        }
      },
    }),
    [],
  );
}
