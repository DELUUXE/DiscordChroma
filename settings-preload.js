const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld(
    'config',
    {
        get: () => ipcRenderer.invoke('settings-win-init'),
        setAutoLaunchState: (state) => ipcRenderer.send('asynchronous-message', 'setAutoLaunchState', state),
        setClientId: (clientId) => ipcRenderer.send('asynchronous-message', 'setting-client-id', clientId),
        setClientSecret: (clientSecret) => ipcRenderer.send('asynchronous-message', 'setting-client-secret', clientSecret),
    }
)

contextBridge.exposeInMainWorld(
    'app',
    {
        restart: () => ipcRenderer.send('asynchronous-message', "restart"),
        exit: () => ipcRenderer.send('asynchronous-message', "exitapp"),
    }
)