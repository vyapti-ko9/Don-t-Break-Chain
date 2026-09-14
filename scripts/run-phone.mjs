/**
 * Build, sync, and install the app on a physical Android phone.
 * Prefers USB/wireless devices and skips emulators.
 * Locates adb from ANDROID_HOME / common SDK paths when not on PATH.
 */
import { execFileSync, execSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', shell: true, ...opts });
}

function resolveSdkRoot() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Android', 'Sdk'),
    process.env.USERPROFILE && join(process.env.USERPROFILE, 'AppData', 'Local', 'Android', 'Sdk'),
    'C:\\Android\\Sdk',
  ].filter(Boolean);

  for (const root of candidates) {
    if (root && existsSync(root)) return root;
  }
  return null;
}

function resolveAdb() {
  const sdk = resolveSdkRoot();
  if (sdk) {
    const local = join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
    if (existsSync(local)) return local;
  }
  // Fall back to PATH
  try {
    execSync(process.platform === 'win32' ? 'where adb' : 'which adb', {
      stdio: 'ignore',
      shell: true,
    });
    return 'adb';
  } catch {
    return null;
  }
}

function listAdbDevices(adb) {
  try {
    const out = execFileSync(adb, ['devices', '-l'], { encoding: 'utf8' });
    return out
      .split(/\r?\n/)
      .slice(1)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [id, state, ...rest] = line.split(/\s+/);
        const meta = rest.join(' ');
        const emulator =
          id.startsWith('emulator-') ||
          /\bmodel:sdk_gphone\b/i.test(meta) ||
          /\bdevice:emu\b/i.test(meta);
        return { id, state, emulator, meta };
      })
      .filter((d) => d.state === 'device');
  } catch (err) {
    console.error('\nFailed to talk to adb:', err instanceof Error ? err.message : err);
    return [];
  }
}

const sdk = resolveSdkRoot();
const adb = resolveAdb();

if (!adb) {
  console.error('\nadb not found.');
  console.error('Install Android SDK Platform-Tools, or set ANDROID_HOME to your SDK folder.');
  console.error('Typical path: %LOCALAPPDATA%\\Android\\Sdk\\platform-tools\\adb.exe');
  process.exit(1);
}

if (sdk) {
  process.env.ANDROID_HOME = process.env.ANDROID_HOME || sdk;
  process.env.ANDROID_SDK_ROOT = process.env.ANDROID_SDK_ROOT || sdk;
  console.log(`SDK: ${sdk}`);
}
console.log(`adb: ${adb}`);

const devices = listAdbDevices(adb);
const phones = devices.filter((d) => !d.emulator);

if (phones.length === 0) {
  console.error('\nNo physical Android phone found.');
  console.error('1. Enable Developer options → USB debugging');
  console.error('2. Plug in the phone (or connect wireless debugging)');
  console.error('3. Accept the RSA prompt on the phone');
  console.error(`4. Check with: "${adb}" devices`);
  if (devices.some((d) => d.emulator)) {
    console.error('\nOnly emulators are connected right now.');
  }
  process.exit(1);
}

const target = phones[0].id;
if (phones.length > 1) {
  console.log(`\nMultiple phones found. Using first: ${target}`);
  phones.forEach((p) => console.log(`  - ${p.id} ${p.meta}`));
} else {
  console.log(`\nPhone: ${target}`);
}

if (!process.env.JAVA_HOME) {
  const guesses = [
    join(process.env.USERPROFILE || '', '.jdks', 'jbr-17.0.14'),
    'C:\\Program Files\\Android\\Android Studio\\jbr',
    'C:\\Program Files\\Java\\jdk-17',
  ];
  for (const guess of guesses) {
    if (existsSync(guess)) {
      process.env.JAVA_HOME = guess;
      break;
    }
  }
}

run('npm run build');
run('npx cap sync android');

const result = spawnSync(
  'npx',
  ['cap', 'run', 'android', '--no-sync', '--target', target],
  { stdio: 'inherit', shell: true, env: process.env },
);

process.exit(result.status ?? 1);
