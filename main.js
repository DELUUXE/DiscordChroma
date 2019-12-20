const { ChromaApp, Color, Key, BcaAnimation, Device: ChromaDevices } = require('@chroma-cloud/chromajs')
const { app, Menu, Tray, BrowserWindow, ipcMain } = require('electron')
const autoUpdater = require('electron-updater').autoUpdater
autoUpdater.logger = require('electron-log')
autoUpdater.logger.transports.file.level = "info"
const path = require('path')
var fs = require('fs')
const WindowsToaster = require('node-notifier').WindowsToaster
var log = require('electron-log')
var childProcess = require('child_process')
const DiscordRPC = require('discord-rpc')
const processExists = require('process-exists')

let client
var DiscordRP = null;

let isClosing = false
let win = null;
let tray = null;
var debugerror = 0;
var error1 = 0;
var warn1 = 0;
var urError = 0;
var ECONNRESET = 0;
var color_var = 16777215;
const discordProcessNames = [
    'Discord.exe',
    'DiscordPTB.exe',
    'DiscordCanary.exe',
]

var spamProtection = false;

//make sure that userdata folder is present
if (!fs.existsSync(app.getPath(`userData`))) {
    fs.mkdirSync(app.getPath(`userData`))
}

//save icon to userData for later reference
if (!fs.existsSync(path.join(app.getPath(`userData`), 'logo.png'))) {
    fs.writeFileSync(path.join(app.getPath(`userData`), 'logo.png'), fs.readFileSync(path.join(__dirname, 'img/logo.png')))
}

//save config to userData for later reference
var config;
if (!fs.existsSync(path.join(app.getPath(`userData`), 'config.json'))) {
    config = {
        autoStart: false,
    }
    fs.writeFileSync(path.join(app.getPath(`userData`), 'config.json'), JSON.stringify(config))
} else {
    config = JSON.parse(fs.readFileSync(path.join(app.getPath(`userData`), 'config.json')));
}
function saveConfig(_config) {
    fs.writeFileSync(path.join(app.getPath(`userData`), 'config.json'), JSON.stringify(_config ? _config : config))
}

//initiate log.txt
log.transports.file.appName = 'DiscordChroma';
log.transports.file.level = 'info';
log.transports.file.format = '{h}:{i}:{s}:{ms} | {text}';
log.transports.file.maxSize = 5 * 1024 * 1024;
log.transports.file.file = path.join(app.getPath(`userData`), 'log.txt');
log.transports.file.streamConfig = { flags: 'w' };
log.transports.file.stream = fs.createWriteStream(path.join(app.getPath(`userData`), 'log.txt'));


// Register the app
const chroma = new ChromaApp(
    'DiscordChroma', // app name
    'discord integration for razer chroma (unofficial)', // description
    'DELUUXE', // author
    'https://deluuxe.nl/discordchroma', // email
    [
        ChromaDevices.ChromaLink,
        ChromaDevices.Headset,
        ChromaDevices.Keypad,
        ChromaDevices.Keyboard,
        ChromaDevices.Mouse,
        ChromaDevices.Mousepad
    ],
    'application'
)

/*chroma.Instance().then((instance) => {
    //instance.playAnimation(new BcaAnimation("BcaAnimations/animation.bca"));
    instance.setAll(new Color(255, 255, 255));
    instance.send();
    setTimeout(function() {
        instance.destroy();
    }, 5000);
});*/

//set sleep function for async
function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

// ------------------------------- define repeating windows ----------------------------- \\

function openSettingsWin() {
    DiscordRPsettings = childProcess.fork(path.join(__dirname, '/discord-rich-presence/DiscordRP-settings.js'))
    let settingswin = new BrowserWindow({
        width: 1000,
        height: 600,
        frame: false,
        resizable: true,
        minHeight: 600,
        minWidth: 1000,
        webPreferences: {
            nodeIntegration: true
        }
    })
    settingswin.loadURL(path.join('file://', __dirname, '/settings.html'))
    settingswin.on('closed', () => {
        DiscordRPsettings.kill()
        if (!isClosing) {
            var notifier = new WindowsToaster({
                withFallback: false, // Fallback to Growl or Balloons?
            })
            notifier.notify({
                title: 'Running in the background',
                message: 'To open the settings, click on the taskbar icon',
                icon: path.join(app.getPath(`userData`), 'logo.png'),
                sound: false, // Bool | String (as defined by http://msdn.microsoft.com/en-us/library/windows/apps/hh761492.aspx)
                wait: true, // Bool. Wait for User Action against Notification or times out
                appID: "com.deluuxe.DiscordChroma",
            })
        }
    })
}

// ------------------------------------ start program ----------------------------------- \\

//when the program is successfully started
app.on('ready', function () {
    //force single instance
    let isSingleInstance = app.requestSingleInstanceLock()

    if (!isSingleInstance) {
        let alreadyrunningwin = new BrowserWindow({ width: 1000, height: 600, frame: false });
        alreadyrunningwin.loadURL(path.join('file://', __dirname, '/alreadyrunning.html'));
        log.info('DiscordChroma was already running.');
        setTimeout(function () {
            app.quit();
            return;
        }, 5000);
    } else {
        log.info("checking for updates");
        autoUpdater.checkForUpdatesAndNotify();
        autoUpdater.on('update-downloaded', () => {
            let updatewin = new BrowserWindow({ width: 1000, height: 600, frame: false });
            updatewin.loadURL(path.join('file://', __dirname, '/update.html'));
            log.info("updated downloaded");
            setTimeout(function () {
                log.info("restarting to install update");
                autoUpdater.quitAndInstall();
            }, 4000);
        });

        log.info("starting DiscordChroma");
        //show discordchroma rich presence
        /*var invoked = false;*/
        DiscordRP = childProcess.fork(path.join(__dirname, '/discord-rich-presence/DiscordRP-start.js'))
        //show splash/loading screen
        win = new BrowserWindow({ width: 1000, height: 600, frame: false, show: false });
        win.loadURL(path.join('file://', __dirname, '/main.html'));
        //makes tray icon for closing and managing the program
        tray = new Tray(path.join(__dirname, '/img/icon.ico'))

        const openSettingsTrayClickHandler = () => {
            openSettingsWin()
        }
        const restartTrayClickHandler = () => {
            log.info("restart requested")
            isClosing = true
            app.relaunch({ args: process.argv.slice(1).concat(['--relaunch']) })

            log.info("closing DiscordChroma")
            //show thx window
            let thxwin = new BrowserWindow({ width: 1000, height: 600, frame: false })
            thxwin.loadURL(path.join('file://', __dirname, '/thx.html'))
            tray.destroy()
            //plays shutdown animation and exit's app at ending
            shutdownAnimation()
        }
        const exitTrayClickHandler = () => {
            isClosing = true
            setTimeout(() => {
                log.info("closing DiscordChroma")
                const DiscordRPend = childProcess.fork(path.join(__dirname, '/discord-rich-presence/DiscordRP-end.js'))
                //show thx window
                let thxwin = new BrowserWindow({ width: 1000, height: 600, frame: false });
                thxwin.loadURL(path.join('file://', __dirname, '/thx.html'));
                tray.destroy();
                //plays shutdown animation and exit's app at ending
                shutdownAnimation(DiscordRPend);
            }, 500)
        }

        const contextMenu = Menu.buildFromTemplate([
            { label: 'Settings', click: openSettingsTrayClickHandler },
            { label: 'Restart', click: restartTrayClickHandler },
            { label: 'Exit', click: exitTrayClickHandler },
        ])
        tray.setToolTip('DiscordChroma (click to open settings)')
        tray.setContextMenu(contextMenu)
        tray.on('click', () => {
            openSettingsWin()
        })

        const { powerMonitor } = require('electron')

        // pause app when pc is suspended
        powerMonitor.on('suspend', () => {
            console.log('The system is going to sleep')
            if (client) {
                client.destroy()
                client = null
            }
        })

        // resume app (reconnect to discord) when pc is resumed
        powerMonitor.on('resume', () => {
            console.log('The system is resuming from sleep')
            if (isDiscordRunning && !waitingForDiscordStart && !client) {
                initDiscord()
            }
        })

        powerMonitor.on('lock-screen', () => {
            console.log('The system is getting locked')
            if (client) {
                client.destroy()
                client = null
            }
        })


        powerMonitor.on('unlock-screen', () => {
            console.log('The system is getting unlocked')
            if (isDiscordRunning && !waitingForDiscordStart && !client) {
                initDiscord()
            }
        })

        win.on("ready-to-show", () => {
            win.show();
            //show startup animation on razer chroma
            startupAnimation();
            setTimeout(function () {
                //hide loading/splash window
                DiscordRP.kill('SIGINT')
                win.hide()
                if (config.clientID && config.clientSecret) {
                    //start discord init process
                    initDiscord()
                } else {
                    let login = new BrowserWindow({
                        width: 1000,
                        height: 700,
                        show: false,
                        frame: false,
                        resizable: false,
                        webPreferences: {
                            nodeIntegration: true
                        }
                    })
                    login.loadURL(path.join('file://', __dirname, '/login.html'))
                    login.show()
                    login.on('closed', () => {
                        if (config.clientID && config.clientSecret) {
                            if (!isClosing) {
                                initDiscord()
                            }
                        } else {
                            if (!isClosing) {
                                login = new BrowserWindow({
                                    width: 1000,
                                    height: 700,
                                    show: false,
                                    frame: false,
                                    resizable: false,
                                    webPreferences: {
                                        nodeIntegration: true
                                    }
                                })
                                login.loadURL(path.join('file://', __dirname, '/login.html'))
                                login.show()
                            }
                        }
                    })
                }
            }, 6000);
        });
    }
});

let isDiscordRunning = true
let waitingForDiscordStart = true

setInterval(async () => {
    if (!waitingForDiscordStart) {
        let processes = await processExists.filterExists(discordProcessNames).catch((err) => {
            log.error(err)
            let errorwin = new BrowserWindow({ width: 1000, height: 600, frame: false })
            errorwin.loadURL(path.join('file://', __dirname, '/error.html'))
            errorwin.on('closed', function () {
                app.exit()
            })
        })
        isDiscordRunning = processes.length > 0 ? true : false
        if (isDiscordRunning == false && client) {
            console.log('discord got closed')
            await client.destroy()
            client = null
        } else if (isDiscordRunning && !waitingForDiscordStart && !client) {
            console.log('discord got opened again after it was closed')
            initDiscord()
        }
    }
}, 5000)

// initDiscord function
async function initDiscord() {
    if (!isDiscordRunning && waitingForDiscordStart) { return }
    waitingForDiscordStart = true
    let processes = await processExists.filterExists(discordProcessNames).catch((err) => {
        log.error(err)
        let errorwin = new BrowserWindow({ width: 1000, height: 600, frame: false })
        errorwin.loadURL(path.join('file://', __dirname, '/error.html'))
        errorwin.on('closed', function () {
            app.exit()
        })
    })

    while (processes.length == 0) {
        isDiscordRunning = false
        waitingForDiscordStart = true
        await sleep(2000)
        processes = await processExists.filterExists(discordProcessNames).catch((err) => {
            log.error(err)
            let errorwin = new BrowserWindow({ width: 1000, height: 600, frame: false })
            errorwin.loadURL(path.join('file://', __dirname, '/error.html'))
            errorwin.on('closed', function () {
                app.exit()
            })
        })
    }

    console.log('discord is running')

    isDiscordRunning = true
    waitingForDiscordStart = false

    client = new DiscordRPC.Client({ transport: "ipc" })

    client.on('ready', () => {
        log.info(`Logged in as ${client.user.username}#${client.user.discriminator}`);
        var notifier = new WindowsToaster({
            withFallback: false, // Fallback to Growl or Balloons?
        });
        //show running notification / connected to discord notification
        notifier.notify(
            {
                title: 'Connected to discord',
                message: 'To open the main menu click here or on the tray icon in the taskbar',
                icon: path.join(app.getPath(`userData`), 'logo.png'),
                sound: false, // Bool | String (as defined by http://msdn.microsoft.com/en-us/library/windows/apps/hh761492.aspx)
                wait: true, // Bool. Wait for User Action against Notification or times out
                appID: "com.deluuxe.DiscordChroma",
            },
            function (error, response) {
                if (response == "the user clicked on the toast.") {
                    openSettingsWin()
                }
            }
        )

        //RPC notification event
        client.subscribe('NOTIFICATION_CREATE', (message) => {
            if (message.message.hasOwnProperty('author_color')) { //guild message
                if (spamProtection == false) {
                    log.info('NEW MESSAGE, title: ' + message.title + ".");
                    spamProtection = true;
                    messageAnimation();
                } else {
                    log.info('NEW MESSAGE, title: ' + message.title + ", but ignored due to spam protection.");
                }
            } else {
                if (spamProtection == false) {
                    log.info('NEW DM');
                    spamProtection = true;
                    dmAnimation();
                } else {
                    log.info('NEW DM, but ignored due to spam protection.');
                }
            }

            // console.log('new message', message)
        })
    })

    // ---------------------------------- discord.js ERROR section --------------------------------- \\
    client.on('error', err => {
        error1 = error1 + 1;
        if (error1 == 1) {
            log.info("There has been an error!");
            log.error(err);
            //show error window
            let errorwin = new BrowserWindow({ width: 1000, height: 600, frame: false });
            errorwin.loadURL(path.join('file://', __dirname, '/error.html'));
            errorwin.on('closed', function () {
                app.exit();
            });
        }
    });


    client.on('warn', () => {
        warn1 = warn1 + 1;
        if (warn1 == 1) {
            log.warn("There has been a warning/error!");
            //show error window
            let errorwin = new BrowserWindow({ width: 1000, height: 600, frame: false });
            errorwin.loadURL(path.join('file://', __dirname, '/error.html'));
            errorwin.on('closed', function () {
                app.exit();
            });
        }
    });
    // ---------------------------------------- END discord.js ERROR section -------------------------------- \\

    authDiscord()
}

function fullAuthDiscord() {
    client.login({ clientId: config.clientID, scopes: ['identify', 'rpc.notifications.read', 'rpc'], clientSecret: config.clientSecret, redirectUri: 'http://localhost:1608/rzr-discord-chroma-callback' }).catch((e) => {
        log.error(e);

        if (e.message.includes('access_denied')) {
            var notifier = new WindowsToaster({
                withFallback: false, // Fallback to Growl or Balloons?
            })

            //show error notification
            notifier.notify({
                title: 'Unable to connect to discord',
                message: 'click here to try again\nOr check if your client id and secret are still correct in the DiscordChroma settings',
                icon: path.join(app.getPath(`userData`), 'logo.png'),
                sound: true, // Bool | String (as defined by http://msdn.microsoft.com/en-us/library/windows/apps/hh761492.aspx)
                wait: true, // Bool. Wait for User Action against Notification or times out
                appID: "com.deluuxe.DiscordChroma",
            }, (err, response) => {
                if (err) {
                    let errorwin = new BrowserWindow({ width: 1000, height: 600, frame: false });
                    errorwin.loadURL(path.join('file://', __dirname, '/error.html'));
                    errorwin.on('closed', function () {
                        app.exit()
                    })
                    return
                }
                if (response == 'the user clicked on the toast.') {
                    authDiscord()
                }
            })
        } else {
            let errorwin = new BrowserWindow({ width: 1000, height: 600, frame: false });
            errorwin.loadURL(path.join('file://', __dirname, '/error.html'));
            errorwin.on('closed', function () {
                app.exit()
            })
        }
    }).then(clientInfo => {
        config.accessToken = clientInfo.accessToken
        saveConfig()
    })
}

function authDiscord() {
    const prevAccessToken = config.accessToken
    if (prevAccessToken) {
        client.login({ clientId: config.clientID, scopes: ['identify', 'rpc.notifications.read', 'rpc'], clientSecret: config.clientSecret, redirectUri: 'http://localhost:1608/rzr-discord-chroma-callback', accessToken: prevAccessToken }).catch(e => {
            if (e && e.message) {
                log.error(e)

                if (e.message.includes('Invalid access token')) {
                    console.error('accesstoken invalid, performing a full auth')
                    fullAuthDiscord()
                } else if (e.message.includes('access_denied')) {
                    var notifier = new WindowsToaster({
                        withFallback: false, // Fallback to Growl or Balloons?
                    })

                    //show error notification
                    notifier.notify({
                        title: 'Unable to connect to discord',
                        message: 'click here to try again\nOr check if your client id and secret are still correct in the DiscordChroma settings',
                        icon: path.join(app.getPath(`userData`), 'logo.png'),
                        sound: true, // Bool | String (as defined by http://msdn.microsoft.com/en-us/library/windows/apps/hh761492.aspx)
                        wait: true, // Bool. Wait for User Action against Notification or times out
                        appID: "com.deluuxe.DiscordChroma",
                    }, (err, response) => {
                        if (err) {
                            let errorwin = new BrowserWindow({ width: 1000, height: 600, frame: false });
                            errorwin.loadURL(path.join('file://', __dirname, '/error.html'));
                            errorwin.on('closed', function () {
                                app.exit()
                            })
                            return
                        }
                        if (response == 'the user clicked on the toast.') {
                            authDiscord()
                        }
                    })
                } else {
                    let errorwin = new BrowserWindow({ width: 1000, height: 600, frame: false });
                    errorwin.loadURL(path.join('file://', __dirname, '/error.html'));
                    errorwin.on('closed', function () {
                        app.exit()
                    })
                }
            } else {
                log.error('A discord login error occurred, but there is no error message')
                let errorwin = new BrowserWindow({ width: 1000, height: 600, frame: false });
                errorwin.loadURL(path.join('file://', __dirname, '/error.html'));
                errorwin.on('closed', function () {
                    app.exit()
                })
            }
        })
    } else {
        fullAuthDiscord()
    }
}

ipcMain.on('synchronous-message', (event, arg, arg1) => {
    //data requests
    if (arg == 'requestConfig') {
        event.returnValue = config
    }
    if (arg == 'requestAutoLaunchConfig') {
        event.returnValue = config.autoStart
    }
})

ipcMain.on('asynchronous-message', (event, arg, arg1) => {
    //functions
    if (arg == "msgcolor") {
        log.info("changed messagecolor to " + arg1);
    } else if (arg == "restart") {
        log.info("restart requested");
        app.relaunch({ args: process.argv.slice(1).concat(['--relaunch']) })

        log.info("closing DiscordChroma");
        //show thx window
        let thxwin = new BrowserWindow({ width: 1000, height: 600, frame: false });
        thxwin.loadURL(path.join('file://', __dirname, '/thx.html'));
        tray.destroy();
        //plays shutdown animation and exit's app at ending
        shutdownAnimation();
    } else if (arg == "setting-client-id") {
        log.info("changed client id to " + arg1)
        config.clientID = arg1
        saveConfig()
    } else if (arg == "setting-client-secret") {
        log.info("changed client secret")
        config.clientSecret = arg1
        saveConfig()
    } else if (arg == "setAutoLaunchState") {
        if (arg1) {
            app.setLoginItemSettings({
                openAtLogin: true,
                args: [
                    '--process-start-args', `"--hidden"`
                ]
            })
            config.autoStart = true
            saveConfig()
        } else {
            app.setLoginItemSettings({
                openAtLogin: false,
            })
            config.autoStart = false
            saveConfig()
        }
    } else if (arg == "exitapp") {
        isClosing = true
        setTimeout(() => {
            log.info("closing DiscordChroma")
            const DiscordRPend = childProcess.fork(path.join(__dirname, '/discord-rich-presence/DiscordRP-end.js'))
            //show thx window
            let thxwin = new BrowserWindow({ width: 1000, height: 600, frame: false });
            thxwin.loadURL(path.join('file://', __dirname, '/thx.html'));
            tray.destroy();
            //plays shutdown animation and exit's app at ending
            shutdownAnimation(DiscordRPend);
        }, 500)
    }
});

async function shutdownAnimation(DiscordRPend) {
    let instance = await chroma.Instance();
    var b = 0;
    for (g = 255; g > 125; g--) {
        instance.setAll(new Color(0, g, b));
        await instance.send();
        b++;
        await sleep(8);
    }
    for (b; b > 0; b--) {
        instance.setAll(new Color(0, g, b));
        await instance.send();
        if (!g <= 0) {
            g--;
        }
        await sleep(8);
    }
    setTimeout(function () {
        if (DiscordRPend) {
            DiscordRPend.kill('SIGINT')
        }
        instance.destroy();
        app.exit();
    }, 2300);
}

async function startupAnimation() {
    let instance = await chroma.Instance();
    var b = 0;
    var r = 0;
    for (g = 255; g > 125; g--) {
        instance.setAll(new Color(r, g, b));
        await instance.send();
        b++;
        await sleep(16);
    }
    for (r; r < 125; r++) {
        instance.setAll(new Color(r, g, b));
        await instance.send();
        if (!g <= 0) {
            g--;
        }
        await sleep(16);
    }
    instance.destroy();
}

async function dmAnimation() {
    let instance = await chroma.Instance();
    var r = 0;
    var i = 0;
    for (i; i < 2; i++) {
        for (r; r < 255; r++) {
            instance.setAll(new Color(r, 0, 0));
            await instance.send();
            await sleep(1);
        }
        for (r; r > 0; r--) {
            instance.setAll(new Color(r, 0, 0));
            await instance.send();
            await sleep(1);
        }
    }
    await instance.destroy()
    await sleep(250)
    spamProtection = false
}


async function messageAnimation() {
    let instance = await chroma.Instance();
    instance.playAnimation(new BcaAnimation(path.join(__dirname, '/BcaAnimations/message.bca')));
    var r = 0;
    var i = 0;
    for (i; i < 3; i++) {
        for (r; r < 255; r++) {
            instance.Mouse.setAll(new Color(0, 0, r));
            instance.Mousepad.setAll(new Color(0, 0, r));
            instance.ChromaLink.setAll(new Color(0, 0, r));
            instance.Headset.setAll(new Color(0, 0, r));
            instance.Keypad.setAll(new Color(0, 0, r));
            await instance.send();
            await sleep(1);
        }
        for (r; r > 0; r--) {
            instance.Mouse.setAll(new Color(0, 0, r));
            instance.Mousepad.setAll(new Color(0, 0, r));
            instance.ChromaLink.setAll(new Color(0, 0, r));
            instance.Headset.setAll(new Color(0, 0, r));
            instance.Keypad.setAll(new Color(0, 0, r));
            await instance.send();
            await sleep(1);
        }
    }
    await instance.destroy()
    await sleep(250)
    spamProtection = false
}

//when a "global" error occurs
process.on('unhandledRejection', err => {
    var errorcode = err.toString();
    if (!errorcode.includes("chromasdk/heartbeat failed")) {
        urError = urError + 1;
        if (urError == 1) {
            log.info("There has been an error!");
            log.error(err);
            //show succesfully started window
            let errorwin = new BrowserWindow({ width: 1000, height: 600, frame: false });
            errorwin.loadURL(path.join('file://', __dirname, '/error.html'));
            errorwin.on('closed', function () {
                app.exit();
            });
        }
    } else {
        log.info(err);
        log.info("but continued as this is error is not a problem");
    }
});
