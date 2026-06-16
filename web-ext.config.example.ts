// Template for a LOCAL dev override. Copy this file to `web-ext.config.ts`
// (which is gitignored) and set the binary path for your machine.
//
//   cp web-ext.config.example.ts web-ext.config.ts
//
// WXT auto-loads `web-ext.config.ts` and uses it to launch the browser for
// `npm run dev`. The key is the build target name — for Chrome/Brave it's
// `chrome`. If you have Google Chrome installed, you don't need this file at
// all; `npm run dev` finds Chrome automatically.

export default {
  binaries: {
    // --- Brave ---
    // macOS:
    chrome: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    // Linux:   chrome: '/usr/bin/brave-browser',
    // Windows: chrome: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',

    // --- Or another Chromium-based browser ---
    // chrome: '/Applications/Chromium.app/Contents/MacOS/Chromium',
    // chrome: '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  },
};
