# React Native Debug Logger 🚀

A premium, high-performance debug monitor and network logger for React Native applications. Intercept Network requests (Fetch, XHR, Axios) and track logs with a beautiful hidden UI.

**Zero forced dependencies.** Works with any storage engine (MMKV, AsyncStorage, Realm, etc.).

![Aesthetic](https://img.shields.io/badge/UI-Premium-blueviolet)
![Type](https://img.shields.io/badge/TypeScript-Ready-blue)
![Deps](https://img.shields.io/badge/Dependencies-Zero-green)

## Features ✨

- 🛠 **Universal Network Monitoring**: Automatically intercepts `fetch` and `XMLHttpRequest`.
- 📦 **Optional Axios Support**: Move beyond standard interceptors. Works only if you have Axios.
- 📱 **Premium UI**: Dark-themed, glassmorphic design for the debug console.
- 🔍 **Advanced Filtering**: Search by URL, Method, or Filter by log type (Request, Response, Error).
- 🔐 **Secure Access**: Clicks-based hidden trigger with optional password protection.
- 🧪 **Dynamic Security**: `isEnabled` and `checkAccess` props for role-based debugging.
- 📤 **Log Export**: Share entire log history via native share sheet.
- 🌐 **Flexible Environment Switcher**: Built-in toggle that works with ANY storage solution.

## Installation 📥

```bash
npm install react-native-debug-logger
```

## Usage 🛠

### ⚡️ Quickest Setup (Automatic)

Just wrap your main app entry (or any component) with `DebugTrigger`. That's it! Everything — including network monitoring — is automatically configured and works in **Release** mode.

```javascript
import { DebugTrigger } from 'react-native-debug-logger';

const App = () => {
  return (
    <DebugTrigger>
      <MainApp />
    </DebugTrigger>
  );
};
```

---

### 🎨 Custom Configuration (All Optional)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `clicksNeeded` | `number` | `5` | Clicks to reveal the password modal |
| `password` | `string` | `'2024'` | Secret password to access the monitor (Set `null` for none) |
| `isDemo` | `boolean` | `false` | Initial environment state |
| `enabled` | `boolean` | `true` | Completely enable/disable the trigger |
| `checkAccess` | `function`| - | Sync/Async function to verify permission |
| `onEnvChange` | `function`| - | Optional switcher (if provided, shows toggle) |

#### 🔘 Persistent Floating Button
Once the debug menu is opened for the first time (via clicks/password), a small **DEBUG** button will appear on the screen (fixed position). This allows you to quickly re-open the menu while navigating through different pages and testing requests. To hide it, use the **"Xitam ver"** button inside the debug menu header.

```javascript
<DebugTrigger 
  password="ADMIN_PASSWORD"
  clicksNeeded={10}
  onEnvChange={(newEnv) => {
    // optional: handle environment toggles
    Storage.set('api_env', newEnv);
  }}
>
  <YourApp />
</DebugTrigger>
```

### 🔬 Manual Setup (Optional)

If you only want the logger without the UI trigger, or need it to start *before* your UI renders, call `setupNetworkMonitor` manually in `index.js`. It's safe to call multiple times.

```javascript
import { setupNetworkMonitor } from 'react-native-debug-logger';

setupNetworkMonitor();
```

## API Reference 📚

### `DebugTrigger`
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `clicksNeeded` | `number` | `5` | Clicks to reveal the password modal |
| `password` | `string` | `'2024'` | Secret password to access the monitor |
| `isDemo` | `boolean` | `false` | Current environment state |
| `enabled` | `boolean` | `true` | Completely enable/disable the trigger |
| `checkAccess` | `function`| - | Sync/Async function to verify user permission |
| `onEnvChange` | `function`| - | Callback when environment is toggled |

### `Logger`
Manual logging if needed:
```javascript
import { Logger } from 'react-native-debug-logger';

Logger.logRequest({ url: '...', method: 'POST', data: { ... } });
Logger.logResponse({ status: 200, data: { ... } });
Logger.logError({ message: 'Something went wrong' });
```

---

## Support & Donation ☕️

If this library has been helpful to you, consider supporting its development! Your contributions help maintain the project and introduce new features.

<div align="center">
  <p><b>Scan the QR code to support:</b></p>
  <a href="https://kofe.al/@alicanov98">
    <img src="https://kofe.al/storage/images/qrcodes/alicanov98-1774646802.png" width="200" alt="Support QR Code" />
  </a>
  <p>
    <a href="https://kofe.al/@alicanov98">
      <b>Buy me a coffee on kofe.al ☕️</b>
    </a>
  </p>
</div>

---
Created with ❤️ by Alijanov
