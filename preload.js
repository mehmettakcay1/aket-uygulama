// Güvenli köprü — web içeriği ile Electron arasında
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronApp', {
    platform: process.platform,
    version: '16'
});
