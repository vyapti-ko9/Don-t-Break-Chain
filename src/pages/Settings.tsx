import { useState } from 'react';
import { useNav } from '../navigation';
import { PageHeader } from './LevelSelect';
import { useSettings } from '../hooks/useSettings';
import { Modal } from '../components/Modal';
import { resetProgress } from '../utils/storage';
import { TOTAL_LEVELS } from '../data/levels';
import { playSound } from '../utils/audio';
import { haptic } from '../utils/haptics';

export function Settings() {
  const nav = useNav();
  const { settings, toggle } = useSettings();
  const [confirmReset, setConfirmReset] = useState(false);
  const [about, setAbout] = useState(false);

  return (
    <div className="screen">
      <PageHeader title="Settings" onBack={() => nav.back()} />
      <div className="scroll-area">
        <div className="card flex flex-col divide-y divide-line p-0">
          <Row label="Sound" desc="Taps, chain energy, completion">
            <Switch on={settings.sound} onClick={() => toggle('sound')} />
          </Row>
          <Row label="Haptics" desc="Vibration feedback where supported">
            <Switch on={settings.haptics} onClick={() => toggle('haptics')} />
          </Row>
          <Row label="Reduced motion" desc="Fewer particles and no screen shake">
            <Switch on={settings.reducedMotion} onClick={() => toggle('reducedMotion')} />
          </Row>
        </div>

        <div className="mt-4 card flex flex-col divide-y divide-line p-0">
          <button className="px-4 py-4 text-left" onClick={() => setAbout(true)}>
            <div className="font-display text-sm font-700">About</div>
            <div className="text-xs text-muted">What is this game?</div>
          </button>
          <div className="flex items-center justify-between px-4 py-4">
            <div className="font-display text-sm font-700">Version</div>
            <div className="text-xs text-muted">1.0.0</div>
          </div>
          <button
            className="px-4 py-4 text-left text-danger"
            onClick={() => {
              playSound('click');
              setConfirmReset(true);
            }}
          >
            <div className="font-display text-sm font-700">Reset progress</div>
            <div className="text-xs text-danger/70">Delete all local data</div>
          </button>
        </div>
      </div>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Are you sure?">
        <p className="text-center text-sm text-muted">
          This will permanently delete your local progress - levels, stars, achievements, streak and
          statistics.
        </p>
        <div className="mt-5 flex gap-2">
          <button className="btn-ghost flex-1" onClick={() => setConfirmReset(false)}>
            CANCEL
          </button>
          <button
            className="btn-danger flex-1"
            onClick={() => {
              resetProgress();
              haptic('error');
              setConfirmReset(false);
              nav.go({ name: 'home' });
            }}
          >
            RESET
          </button>
        </div>
      </Modal>

      <Modal open={about} onClose={() => setAbout(false)} title="Don't Break the Chain">
        <p className="text-sm text-muted">
          A satisfying chain-reaction puzzle game. Find the one correct link, tap it, and watch the
          energy race through the whole chain. {TOTAL_LEVELS} handcrafted levels across five worlds,
          a new Daily Challenge every day, and it all works fully offline.
        </p>
        <p className="mt-3 text-xs text-muted">
          One mistake. Everything falls apart. Built with React, Vite, TypeScript, Tailwind and HTML5
          Canvas.
        </p>
        <button className="btn-primary mt-4 w-full" onClick={() => setAbout(false)}>
          CLOSE
        </button>
      </Modal>
    </div>
  );
}

function Row({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-4">
      <div>
        <div className="font-display text-sm font-700">{label}</div>
        <div className="text-xs text-muted">{desc}</div>
      </div>
      {children}
    </div>
  );
}

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={`relative h-7 w-12 flex-none shrink-0 overflow-hidden rounded-full transition-colors ${
        on ? 'bg-accent' : 'bg-line'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 block h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          on ? 'translate-x-[1.25rem]' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
