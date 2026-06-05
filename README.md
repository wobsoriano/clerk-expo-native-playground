# Clerk Expo Native Components Playground

This playground is for testing the native `@clerk/expo` prebuilt components on iOS and Android:

- `AuthView`
- `UserButton`
- `UserProfileView`
- JS/native auth-state sync after sign-in, profile dismissal, and sign-out

## Prerequisites

- Node.js and npm
- Xcode for iOS simulator/device testing
- Android Studio, Android SDK, and an emulator or connected Android device
- A Clerk publishable key

## Setup

Generate the native projects for this native-module test app first:

```sh
npx expo prebuild --clean
```

Install dependencies:

```sh
npm install
```

Create a local env file:

```sh
cp .env.example .env
```

Set your Clerk publishable key in `.env`:

```sh
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

## Run On Android

Start an emulator or connect an Android device, then run:

```sh
npm run android
```

If native files need to be regenerated, run:

```sh
npx expo prebuild --clean --platform android
npm run android
```

## Run On iOS

Start an iOS simulator, then run:

```sh
npm run ios
```

If native files need to be regenerated, run:

```sh
npx expo prebuild --clean --platform ios
npm run ios
```

## Test Checklist

Signed-out state:

1. Open `AuthView in Modal (default props)`.
2. Confirm the native auth UI appears and can be dismissed.
3. Open `AuthView in Modal (isDismissible={false})`.
4. Confirm there is no dismiss button.
5. Open `AuthView fullscreen (required)`.
6. Complete sign-in and confirm the app returns to the signed-in state.

Signed-in state:

1. Confirm `userId` and `sessionId` are shown.
2. Tap the native `UserButton`.
3. Confirm the native profile surface opens.
4. Open `UserProfileView in Modal`.
5. Dismiss it and confirm the modal closes.
6. Sign out from inside the native profile flow and confirm JS updates to signed out.
7. Use `Sign out (JS)` and confirm native/JS state stays in sync.

The on-screen event log records auth transitions and timing. The same entries are also printed to Metro, Xcode, or logcat with the `[testlog]` prefix.

## Troubleshooting

If Metro serves stale code:

```sh
npx expo start --clear
```

If native module changes are not reflected:

```sh
npx expo prebuild --clean
```

Then rerun the target platform:

```sh
npm run android
# or
npm run ios
```

If install fails because `.npmrc` points to a local registry, remove or update the local registry override before running `npm install`.
