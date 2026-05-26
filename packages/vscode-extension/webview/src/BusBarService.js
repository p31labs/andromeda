"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusBarService = void 0;
class BusBarService {
    constructor() {
        this.listeners = [];
        window.addEventListener('message', event => {
            this.listeners.forEach(listener => listener(event.data));
        });
    }
    onMessage(callback) {
        this.listeners.push(callback);
    }
    sendMessage(message) {
        const vscode = window.acquireVsCodeApi();
        vscode.postMessage(message);
    }
}
exports.BusBarService = BusBarService;
