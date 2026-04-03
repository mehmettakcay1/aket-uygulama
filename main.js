const { app, BrowserWindow, Menu, Tray, shell, ipcMain, dialog } = require('electron');
const path = require('path');

let mainWindow;
let tray;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 900,
        minHeight: 600,
        title: 'AK ET Kurumsal Yönetim Sistemi',
        icon: path.join(__dirname, 'AK-ET KURUMSAL LOGO.png'),
        backgroundColor: '#121212',
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadFile('index.html');

    // Yüklenince göster (beyaz flash yok)
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Kapat butonuna basınca tray'e minimize et
    mainWindow.on('close', (e) => {
        if (!app.isQuitting) {
            e.preventDefault();
            mainWindow.hide();
        }
    });

    // Menüyü kaldır (kurumsal, temiz görünüm)
    Menu.setApplicationMenu(null);
}

function createTray() {
    tray = new Tray(path.join(__dirname, 'AK-ET KURUMSAL LOGO.png'));
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'AK ET Yönetim Sistemini Aç',
            click: () => { mainWindow.show(); mainWindow.focus(); }
        },
        { type: 'separator' },
        {
            label: 'Sürüm: v16',
            enabled: false
        },
        { type: 'separator' },
        {
            label: 'Çıkış',
            click: () => {
                app.isQuitting = true;
                app.quit();
            }
        }
    ]);
    tray.setToolTip('AK ET Kurumsal Yönetim Sistemi');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => {
        mainWindow.show();
        mainWindow.focus();
    });
}

app.whenReady().then(() => {
    createWindow();
    createTray();
});

app.on('window-all-closed', () => {
    // Windows'ta tray'de kalır, çıkış yapmaz
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Harici linkleri tarayıcıda aç
app.on('web-contents-created', (_, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
});
