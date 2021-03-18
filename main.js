const {app, BrowserWindow, ipcMain} = require('electron')
const path = require('path')
const axios = require('axios');
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

function createWindow() {
    const SERVER_ENV_NAME = 'server';
    const CLIENT_ENV_NAME = 'client';

    const PING_SERVER_INTERVAL_SEC = 5;
    let SERVER_IS_ONLINE = false;

    const cmd_env = app.commandLine.getSwitchValue("env");
    const env = cmd_env ? cmd_env : (process.env.NODE_ENV ? process.env.NODE_ENV.trim() : CLIENT_ENV_NAME)

    const serverPort = (env === SERVER_ENV_NAME) ? 3001 : 3000;
    const host = '127.0.0.1';


    console.log(`Starting ${env} application`);
    const win = new BrowserWindow({
        width: 1024,
        height: 768,
        title: `Electron express example: ${env.toUpperCase()} env.`,
        webPreferences: {
            nodeIntegration: false, // is default value after Electron v5
            contextIsolation: true, // protect against prototype pollution
            enableRemoteModule: false, // turn off remote
            preload: path.join(__dirname, 'preload.js')
        }
    })
    win.webContents.openDevTools()

    win.loadFile('index.html');

    // start server mb need create fork for it
    app.server = require(__dirname + '/server/')(host, serverPort, true, env);

    ipcMain.on('toMain', (event, data) => {
        win.webContents.send('fromMain', 'config', {
            env,
            url: `http://${host}:${serverPort}`
        })
    })

    if (env === CLIENT_ENV_NAME) {
        // get server status
        setInterval(() => {
            try {
                axios.get(`http://${host}:${serverPort}/status`).then((response) => {
                    console.log(response.data);
                    if (response.status === 200 && response.data.connectedToMainServer) {
                        win.webContents.send('fromMain', 'status', response.data)
                        SERVER_IS_ONLINE = true;
                    } else {
                        win.webContents.send('fromMain', 'status', {connectedToMainServer: false})
                        SERVER_IS_ONLINE = false;
                    }
                })
            } catch (e) {
                console.log('Exception:', e)
                win.webContents.send('fromMain', 'status', {connectedToMainServer: false})
                SERVER_IS_ONLINE = false;
            }
        }, 1000 * PING_SERVER_INTERVAL_SEC)
    }

}

app.whenReady().then(() => {
    createWindow()


    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
