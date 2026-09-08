import { useEffect, useRef } from 'react';
import { GameEngine } from '../game/engine/GameEngine';
import type { EngineHud, EngineResult, EngineStatus, LevelDef } from '../game/types';

interface Props {
  level: LevelDef;
  reducedMotion: boolean;
  hintLevel: number;
  onStatus?: (s: EngineStatus) => void;
  onHud?: (h: EngineHud) => void;
  onResult?: (r: EngineResult) => void;
  onMistake?: (n: number) => void;
  onChainLength?: (n: number) => void;
}

export function GameCanvas(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const cb = useRef(props);
  cb.current = props;

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;

    const engine = new GameEngine(
      canvas,
      props.level,
      {
        onStatus: (s) => cb.current.onStatus?.(s),
        onHud: (h) => cb.current.onHud?.(h),
        onMistake: (n) => cb.current.onMistake?.(n),
        onResult: (r) => {
          cb.current.onChainLength?.(engine.chainLength);
          cb.current.onResult?.(r);
        },
      },
      { reducedMotion: props.reducedMotion },
    );
    engineRef.current = engine;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      engine.resize(host.clientWidth, host.clientHeight, dpr);
    };
    resize();
    engine.start();

    const ro = new ResizeObserver(resize);
    ro.observe(host);
    window.addEventListener('orientationchange', resize);
    const onVis = () => engine.setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVis);

    return () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', resize);
      document.removeEventListener('visibilitychange', onVis);
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.level]);

  useEffect(() => {
    engineRef.current?.setHintLevel(props.hintLevel);
  }, [props.hintLevel]);

  return (
    <div className="relative h-full w-full">
      <canvas ref={canvasRef} className="block h-full w-full touch-none" />
    </div>
  );
}
