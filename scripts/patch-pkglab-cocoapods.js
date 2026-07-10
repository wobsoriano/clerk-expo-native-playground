const fs = require('fs');
const path = require('path');

const clerkNodeModulesDir = path.join(process.cwd(), 'node_modules', '@clerk');

function hasPodspec(packageDir) {
  const iosDir = path.join(packageDir, 'ios');

  if (!fs.existsSync(iosDir)) {
    return false;
  }

  return fs.readdirSync(iosDir).some(file => file.endsWith('.podspec'));
}

function toCocoaPodsSafeVersion(version) {
  const prereleaseIndex = version.indexOf('-');

  if (prereleaseIndex === -1) {
    return version;
  }

  const base = version.slice(0, prereleaseIndex);
  const prereleaseAndBuild = version.slice(prereleaseIndex + 1);
  const [prerelease, build] = prereleaseAndBuild.split('+');
  const metadata = [prerelease, build].filter(Boolean).join('.');

  return `${base}+${metadata}`;
}

if (!fs.existsSync(clerkNodeModulesDir)) {
  console.log('No @clerk packages found in node_modules.');
  process.exit(0);
}

const patchedPackages = [];

for (const packageName of fs.readdirSync(clerkNodeModulesDir)) {
  const packageDir = path.join(clerkNodeModulesDir, packageName);
  const packageJsonPath = path.join(packageDir, 'package.json');

  if (!fs.existsSync(packageJsonPath) || !hasPodspec(packageDir)) {
    continue;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const nextVersion = toCocoaPodsSafeVersion(packageJson.version);

  if (nextVersion === packageJson.version) {
    continue;
  }

  packageJson.version = nextVersion;
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
  patchedPackages.push(`${packageJson.name}@${nextVersion}`);
}

if (patchedPackages.length === 0) {
  console.log('No CocoaPods-unsafe @clerk native package versions found.');
} else {
  console.log(`Patched CocoaPods-safe versions for ${patchedPackages.join(', ')}.`);
}
