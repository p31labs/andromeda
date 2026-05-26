
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  const provider = new LawDashboardViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(LawDashboardViewProvider.viewType, provider));

  vscode.window.onDidChangeActiveTextEditor(editor => {
    if (editor) {
      provider.updateActiveEditor(editor.document.fileName, editor.document.getText());
    }
  });
}

class LawDashboardViewProvider implements vscode.WebviewViewProvider {

  public static readonly viewType = 'p31.lawDashboard';

  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
  ) { }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        this._extensionUri
      ]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
  }

  public updateActiveEditor(fileName: string, content: string) {
    if (this._view) {
        this._view.webview.postMessage({ type: 'activeEditorChange', payload: { fileName, content } });
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview.css'));

    const nonce = getNonce();

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}' 'unsafe-eval';">
        <link href="${styleUri}" rel="stylesheet">
        <title>Law Dashboard</title>
      </head>
      <body>
        <div id="root"></div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`;
  }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
