# P31 VS CODE WEBVIEW BLACKOUT RESEARCH PROMPT

## CRITICAL CONTEXT
- **Workspace:** `C:\Users\sandra\Documents\P31_Andromeda\p31-vs-code-ai-extension`
- **Extension Name:** `p31-vs-code-ai-extension` (P31 COCKPIT)
- **Current State:** Black screen despite successful build and install
- **Build Status:** VSIX 0.0.1 installs correctly, assets present in package

## TECHNICAL SPECIFICS

### File Structure
```
p31-vs-code-ai-extension/
├── dist/
│   └── webview/
│       ├── webview.js      (194KB ES module)
│       ├── webview.css     (2.6KB)
│       └── index.html      (Vite placeholder)
├── src/extension.ts        (WebviewViewProvider)
├── webview-ui/src/App.tsx  (React + Three.js)
└── vite.config.ts
```

### Extension.ts CSP Configuration (Current)
```typescript
webviewView.webview.options = {
  enableScripts: true,
  localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview')],
};

return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'unsafe-eval' ${webview.cspSource}; font-src ${webview.cspSource};">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="${styleUri}" rel="stylesheet">
    <title>P31 Copilot</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" crossorigin src="${scriptUri}"></script>
  </body>
  </html>`;
```

### Vite Config (webview-ui/vite.config.ts)
```typescript
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../dist/webview',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'webview.js',
        chunkFileNames: '[name].js',
        assetFileNames: 'webview.[ext]'
      }
    }
  }
});
```

### package.json Contributing View
```json
{
  "views": {
    "p31-sidebar-view": [
      {
        "id": "p31-sidebar",
        "name": "P31 Cockpit",
        "type": "webview"
      }
    ]
  }
}
```

## SYMPTOMS
1. Tab opens showing "P31 Cockpit" title
2. Entire panel is black/empty
3. No visible errors to user
4. Must use "Developer: Open Webview Developer Tools" to diagnose

## WHAT HAS BEEN ATTEMPTED
1. ✅ Removed `vite-plugin-singlefile` - now outputs separate JS/CSS
2. ✅ Changed CSP to include `'unsafe-eval'` for Webpack/Vite bundles
3. ✅ Changed `localResourceRoots` to point to `dist/webview`
4. ✅ Added `type="module"` to script tag for ES module support
5. ✅ Removed nonce (CSP 3 ignores nonce on module scripts)
6. ✅ All paths use `vscode.Uri.joinPath()` for portability

## RESEARCH QUESTIONS FOR GEMINI

### Primary Questions
1. **What is the exact CSP configuration required for Vite ES modules in VS Code webviews?** Does the current CSP violate any restrictions?

2. **How should `webview.cspSource` be used with module scripts?** Does it need to be in `script-src` when using `type="module"`?

3. **What are the common causes of silent blackouts in VS Code React webviews when scripts appear to load but nothing renders?**

### Secondary Questions
4. **Should we use a WebviewPanel vs WebviewView?** Does the view type affect resource loading?

5. **Are there any VS Code settings that silently block webview content?** (e.g., `webview.experimental.useExternalAutofill`, GPU hardware acceleration)

6. **What does the actual webview.js content look like?** (First 10 lines to verify it's valid ES module)

### Deep Technical Investigation
7. **Compare our CSP against working VS Code extensions that use React+Three.js** - specifically the exact meta tag format.

8. **What is the correct way to handle the `crossorigin` attribute with VS Code webview URIs?** Does `asWebviewUri` handle this automatically?

9. **Should we be using the built-in VS Code nonce pattern or is it incompatible with modules?**

10. **What log output should we expect to see in Webview Developer Tools?** Provide specific error patterns to look for.

## DESIRED OUTPUT FROM GEMINI
- **Root cause diagnosis** of the black screen
- **Working code snippet** for extension.ts HTML template
- **Exact CSP string** that works with Vite ES modules
- **Verification checklist** of webview configuration items
- **Common gotchas** not yet addressed

## ATTACHMENT: Current State Files
- `p31-vs-code-ai-extension/src/extension.ts`
- `p31-vs-code-ai-extension/webview-ui/vite.config.ts`
- `p31-vs-code-ai-extension/package.json`
- `p31-vs-code-ai-extension/.vscodeignore`