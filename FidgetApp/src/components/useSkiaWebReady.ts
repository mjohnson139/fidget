import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Skia's renderer is compiled into the native binary, so on iOS/Android it is
 * ready the instant the app boots. On web there is no native layer: the
 * CanvasKit WASM has to be fetched and initialized before any `<Canvas>`
 * mounts, or every Skia component renders nothing.
 *
 * This hook returns `true` immediately on native, and on web flips to `true`
 * once CanvasKit has finished loading. The wasm is served from
 * `/canvaskit.wasm`, copied into `public/` by `npx setup-skia-web public`
 * (see the web build notes in the sprint doc).
 */
export function useSkiaWebReady(): boolean {
  const [ready, setReady] = useState(Platform.OS !== 'web');

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let cancelled = false;
    void import('@shopify/react-native-skia/lib/module/web')
      .then(({ LoadSkiaWeb }) => LoadSkiaWeb())
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((err) => {
        console.error('Failed to load Skia (CanvasKit) for web', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}
