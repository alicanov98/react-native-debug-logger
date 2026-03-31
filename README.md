# React Native Debug Logger 🚀

A premium, high-performance debug monitor and network logger for React Native applications. Intercept Network requests (Fetch, XHR, Axios) and track logs with a beautiful hidden UI.

**Zero forced dependencies.** Works with any storage engine (MMKV, AsyncStorage, Realm, etc.).

![Aesthetic](https://img.shields.io/badge/UI-Premium-blueviolet)
![Type](https://img.shields.io/badge/TypeScript-Ready-blue)
![Deps](https://img.shields.io/badge/Dependencies-Zero-green)

## Features ✨

- 🛠 **Universal Network Monitoring**: Automatically intercepts `fetch` and `XMLHttpRequest`.
- 🔗 **Automatic URL Redirection**: Change your API's Base URL at runtime from the Debug Settings. All app traffic (Fetch/Axios) will follow!
- 📦 **Optional Axios Support**: Move beyond standard interceptors. Works only if you have Axios.
- 📱 **Premium UI**: Dark-themed, glassmorphic design with a unified **"ALL"** log view.
- 🔍 **Advanced Filtering**: Search by URL, Method, or Filter by log type (Request, Response, Error).
- 🔐 **Secure Access**: Clicks-based hidden trigger with optional password protection.
- 🧪 **Dynamic Security**: `isEnabled` and `checkAccess` props for role-based debugging.
- 📤 **Log Export**: Share entire log history via native share sheet or copy as **cURL**.
- 🌐 **Flexible Environment Switcher**: Built-in toggle and Predefined URL lists.

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
    <DebugTrigger 
      password="2024"
      baseUrls={[
        { title: 'Development', url: 'https://dev-api.example.com' },
        { title: 'Staging', url: 'https://staging-api.example.com' }
      ]}
    >
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
| `baseUrls` | `array` | `[]` | List of predefined API URLs (strings or `{title, url}` objects) |
| `enabled` | `boolean` | `true` | Completely enable/disable the trigger |
| `onEnvChange` | `function`| - | Optional switcher (if provided, shows toggle in settings) |
| `onBaseUrlChange`| `function`| - | Callback when Base URL is updated |

#### 🔘 Dynamic Redirection Logic
When you set a **Custom URL** or pick a **Predefined Source** in the Settings tab, the library automatically intercepts all outgoing requests and replaces their origin with your new selection.
*Example: Redirecting `https://api.prod.com/v1/user` to `https://api.test.com/v1/user` happens automatically!*

#### 🔘 Persistent Floating Button
Once the debug menu is opened for the first time, a small **DEBUG** button appears. To hide it completely, use the **"Xitam"** (Exit) button inside the debug monitor header.

### 🔬 Manual Setup (Optional)

If you only want the logger without the UI trigger, or need it to start *before* your UI renders, call `setupNetworkMonitor` manually in `index.js`.

```javascript
import { setupNetworkMonitor } from 'react-native-debug-logger';

setupNetworkMonitor();
```

## API Reference 📚

### `DebugTrigger`
All props listed in the table above are supported.

### `Logger`
Manual logging if needed:
```javascript
import { Logger } from 'react-native-debug-logger';

Logger.logRequest({ url: '...', method: 'POST', data: { ... } });
Logger.logResponse({ status: 200, data: { ... }, headers: { ... } });
Logger.logError({ message: 'Something went wrong' });
```

---

## Support & Donation ☕️

If this library has been helpful to you, consider supporting its development!

<div align="center">
  <p><b>Scan the QR code to support:</b></p>
  <a href="https://kofe.al/@alicanov98">
    <img src="https://kofe.al/storage/images/qrcodes/alicanov98-1774646802.png" width="200" alt="Support QR Code" />
  </a>
</div>

---
Created with ❤️ by Alijanov
