
export class BusBarService {
  private listeners: any[] = [];

  constructor() {
    window.addEventListener('message', event => {
      this.listeners.forEach(listener => listener(event.data));
    });
  }

  public onMessage(callback: (message: any) => void) {
    this.listeners.push(callback);
  }

  public sendMessage(message: any) {
    const vscode = (window as any).acquireVsCodeApi();
    vscode.postMessage(message);
  }
}
