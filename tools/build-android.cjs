/** Compila el APK debug usando el SDK configurado. No instala herramientas ni acepta licencias automáticamente. */
const { existsSync, readdirSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { spawnSync } = require('node:child_process');

const root = resolve(__dirname, '..');
const env = { ...process.env };
const sdk = env.ANDROID_HOME || env.ANDROID_SDK_ROOT || [
  join(root, '.android-tools', 'sdk'),
  join(env.LOCALAPPDATA || '', 'Android', 'Sdk'),
].find(path => existsSync(join(path, 'platforms', 'android-36')));
if (!sdk) {
  console.error('Falta Android SDK 36. Instalalo desde Android Studio y configurá ANDROID_HOME. Consultá docs/ANDROID.md.');
  process.exit(1);
}
env.ANDROID_HOME = sdk;
// En Windows podemos aprovechar los JDK de IntelliJ, sin modificar la configuración global del equipo.
if (!env.JAVA_HOME && process.platform === 'win32') {
  const localJdks = join(root, '.android-tools', 'jdk21');
  if (existsSync(localJdks)) env.JAVA_HOME = readdirSync(localJdks)
    .map(name => join(localJdks, name)).find(path => existsSync(join(path, 'bin', 'java.exe')));
  const jdks = join(env.USERPROFILE || '', '.jdks');
  if (!env.JAVA_HOME && existsSync(jdks)) env.JAVA_HOME = readdirSync(jdks)
    .filter(name => /^openjdk-(21|22|23|24)[.-]/.test(name))
    .map(name => join(jdks, name)).find(path => existsSync(join(path, 'bin', 'java.exe')));
}
env.GRADLE_USER_HOME ||= join(root, '.android-tools', 'gradle');
if (process.platform === 'win32' && !env.JAVA_TOOL_OPTIONS) {
  // Usa las autoridades confiables de Windows; mantiene activa la verificación de certificados.
  env.JAVA_TOOL_OPTIONS = '-Djavax.net.ssl.trustStoreType=Windows-ROOT -Djavax.net.ssl.trustStore=NONE';
}
const windows = process.platform === 'win32';
const result = spawnSync(windows ? 'cmd.exe' : './gradlew', windows
  ? ['/d', '/c', 'gradlew.bat assembleDebug --no-daemon']
  : ['assembleDebug', '--no-daemon'], { cwd: join(root, 'frontend', 'android'), env, stdio: 'inherit' });
if (result.error) console.error(result.error.message);
if (result.status === 0) console.log(`APK: ${join(root, 'frontend/android/app/build/outputs/apk/debug/app-debug.apk')}`);
process.exit(result.status ?? 1);
