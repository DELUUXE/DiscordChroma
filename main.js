//const { ChromaApp, Color, Key, BcaAnimation } = require('./chroma.cjs');
const { ChromaApp, Color, Key, BcaAnimation } = require('@chroma-cloud/chromajs');
const electron = require('electron');
const {Menu, Tray} = require('electron');
const { ipcRenderer } = require('electron');
const BrowserWindow = electron.BrowserWindow;
const app = electron.app;
const autoUpdater = require("electron-updater").autoUpdater;
autoUpdater.logger = require("electron-log");
autoUpdater.logger.transports.file.level = "info"
const path = require('path');
var fs = require('fs');
const WindowsToaster = require('node-notifier').WindowsToaster;
var log = require('electron-log');
var shell = require('electron').shell;
const {ipcMain} = require('electron');
const {session} = require('electron');
var AutoLaunch = require('auto-launch');
var childProcess = require('child_process');
const Discord = require('discord.js');
let client = null;
var DiscordRP = null;


let authWindow = null;
let token = null;
let win = null;
let loginwin;
let tray = null;
var debugerror = 0;
var error1 = 0;
var warn1 = 0;
var urError = 0;
var ECONNRESET = 0;
var token1 = null;
var color_var = 16777215;

var spamProtection = false;

//save icon to userData for later refference
if(!fs.existsSync(path.join(app.getPath(`userData`), 'logo.png'))){
    fs.writeFileSync(path.join(app.getPath(`userData`), 'logo.png'), fs.readFileSync(path.join(__dirname, 'img/logo.png')))
} 

//save config to userData for later refference
var config;
if(!fs.existsSync(path.join(app.getPath(`userData`), 'config.json'))){
    config = {
        "autoStart": false
    }
    fs.writeFileSync(path.join(app.getPath(`userData`), 'config.json'), JSON.stringify(config))
} else {
    config = JSON.parse(fs.readFileSync(path.join(app.getPath(`userData`), 'config.json')));
} 

//initiate log.txt
log.transports.file.appName = 'DiscordChroma';
log.transports.file.level = 'info';
log.transports.file.format = '{h}:{i}:{s}:{ms} {text}';
log.transports.file.maxSize = 5 * 1024 * 1024;
log.transports.file.file = path.join(app.getPath(`userData`),'log.txt');
log.transports.file.streamConfig = { flags: 'w' };
log.transports.file.stream = fs.createWriteStream(path.join(app.getPath(`userData`),'log.txt'));


// Register the app
const chroma = new ChromaApp("DiscordChroma", "discord integration for razer chroma", "DELUUXE", "info@deluuxe.nl");

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

// ------------------------------------ start program ----------------------------------- \\

//when the program is succesfully started
app.on('ready', function () {
    //force single instance
    var shouldQuit = app.makeSingleInstance(function(commandLine, workingDirectory) {
        // Someone tried to run a second instance.
    });
    if (shouldQuit) {
        let alreadyrunningwin = new BrowserWindow({width: 1000, height: 600, frame: false});
        alreadyrunningwin.loadURL(path.join('file://', __dirname, '/alreadyrunning.html'));
        log.info('DiscordChroma was already running.');
        setTimeout(function() {
            app.quit();
            return;
        }, 5000);
    } else {
        log.info("checking for updates");
        autoUpdater.checkForUpdatesAndNotify();
        autoUpdater.on('update-downloaded', () => {
        let updatewin = new BrowserWindow({width: 1000, height: 600, frame: false});
        updatewin.loadURL(path.join('file://', __dirname, '/update.html'));
        log.info("updated downloaded");
        setTimeout(function() {
            log.info("restarting to install update");
            autoUpdater.quitAndInstall();
        }, 4000);
        });

        log.info("starting DiscordChroma");
        //show discordchroma rich presence
        /*var invoked = false;
        DiscordRP = childProcess.fork(path.join(__dirname, '/DiscordRP.js'));*/
        //show splash/loading screen
        win = new BrowserWindow({width: 1000, height: 600, frame: false, show: false});
        win.loadURL(path.join('file://', __dirname, '/main.html'));
        //makes tray icon for closing and managing the program
        tray = new Tray(path.join(__dirname, '/img/icon.ico'));
        const contextMenu = Menu.buildFromTemplate([
            {label: 'Close'},
        ]);
        tray.setToolTip('DiscordChroma (click to open settings)');
        //tray.setContextMenu(contextMenu);
        tray.on('click', () => {
            let settingswin = new BrowserWindow({width: 800, height: 500, frame: false, resizable: false});
            settingswin.loadURL(path.join('file://', __dirname, '/settings.html'));
            /*var AutoLauncher = new AutoLaunch({
                name: 'DiscordChroma'
            });
            AutoLauncher.isEnabled()
            .then(function(isEnabled){
                setTimeout(() => {
                    if(isEnabled){
                        settingswin.webContents.send('autoStartToggled', "Turn on")
                    } else {
                        settingswin.webContents.send('autoStartToggled', "Turn off")
                    }
                }, 1000);
            })*/
                //starting discordRP
            /*if(!DiscordRP) {
                DiscordRP = childProcess.fork(path.join(__dirname, '/DiscordRP.js'));
            }
            settingswin.on('closed', function () {
                //stop discord rich presence
                DiscordRP.kill('SIGINT');
                DiscordRP = null;
            });*/
        });
        //
        win.on("ready-to-show", ()=>{
            win.show();
            //show startup animation on razerchroma
            startupAnimation();
            setTimeout(function() {
                //hide loading/splash window
                win.hide();
                //start login process
                authenticateDiscord();
            }, 6000);
        });
    }
});

// logout function
function logout() {
    log.info("user logged out");
    session.defaultSession.clearStorageData({
      origin: "https://discordapp.com",
      storages: ["localstorage"]
    }, ()=> {
      token = null;
      if(client) client.destroy();
      client = new Discord.Client();
      authenticateDiscord();
    });
}

// login fuction
function login() {
    if(client) client.destroy();
    client = new Discord.Client();

    client.on('ready', () => {
        log.info(`Logged in as ` + client.user.tag);
        var notifier = new WindowsToaster({
            withFallback: false, // Fallback to Growl or Balloons?
        });
        //show running notification
        notifier.notify(
            {
                title: 'DiscordChroma is running in the background',
                message: 'To open the main menu click here or on the tray icon in the taskbar',
                icon: path.join(app.getPath(`userData`), 'logo.png'),
                sound: true, // Bool | String (as defined by http://msdn.microsoft.com/en-us/library/windows/apps/hh761492.aspx)
                wait: true, // Bool. Wait for User Action against Notification or times out
                appID: "com.deluuxe.DiscordChroma",
            },
            function(error, response) {
                log.info(response);
                if (response == "the user clicked on the toast.") {
                    let settingswin = new BrowserWindow({width: 800, height: 500, frame: false, resizable: false});
                    settingswin.loadURL(path.join('file://', __dirname, '/settings.html'));
                    /*var AutoLauncher = new AutoLaunch({
                        name: 'DiscordChroma'
                    });
                    AutoLauncher.isEnabled()
                    .then(function(isEnabled){
                        setTimeout(() => {
                            if(isEnabled){
                                settingswin.webContents.send('autoStartToggled', "Turn on")
                            } else {
                                settingswin.webContents.send('autoStartToggled', "Turn off")
                            }
                        }, 1000);
                    })*/
                    /*settingswin.on('closed', function () {
                        //stop discord rich presence
                        DiscordRP.kill('SIGINT');
                        DiscordRP = null;
                    });*/
                } else {
                    //stop discord rich presence
                    /*DiscordRP.kill('SIGINT');
                    DiscordRP = null;*/
                }
            }
        );  
    });

    //when you receive a message
    client.on('message', message => {
        if(message.channel.type == "text"){
            if(message.guild.muted == false){
                if(message.channel.muted == false){
                    if(message.author.id != client.user.id){
                        //do only when it's a message from a non-muted server and not from yourself
                        if(spamProtection == false){
                            log.info('NEW MESSAGE, in ' + message.guild.name + ".");
                            spamProtection = true;
                            messageAnimation();
                        } else {
                            log.info('NEW MESSAGE, in ' + message.guild.name + ", but ignored due to spam protection.");
                        }
                    }
                }
            }
        } else if(message.channel.type == "dm" || message.channel.type == "group"){
            if(message.author.id != client.user.id){
                //do only when it's a message from DM or GroupDM and if it's not from yourself
                if(spamProtection == false){
                    log.info('NEW DM');
                    spamProtection = true;
                    dmAnimation();
                } else {
                    log.info('NEW DM, but ignored due to spam protection.');
                }
            }
        }
    });

    client.on('voiceStateUpdate', (oldMember, newMember) =>{
        /*log.info("-----voiceStateUpdate-----");
        log.info("old member " + oldMember.user.username);
        log.info("old member channel id " + oldMember.voiceChannelID);
        log.info("new member " + newMember.user.username);
        log.info("new member channel id " + newMember.voiceChannelID);*/
        /*
        var userChannel = client.channels.find(channel => channel.type=="voice" && channel.members.has(client.user.id));
        if (userChannel && oldMember.user != client.user && newMember.user != client.user) {
            if(newMember.voiceChannelID == userChannel.id) {
                console.log("a user joined your channel");
                messageAnimation();
            } else if (oldMember.voiceChannelID == userChannel.id) {
                console.log("a user left your channel");
                messageAnimation();
            }
        } else if (oldMember.user == client.user && newMember.user == client.user) {
            if(newMember.voiceChannelID == null) { 
                console.log("you left a channel");
                messageAnimation();
            } else if (oldMember.voiceChannelID == null) {
                console.log("you joined a channel");
                messageAnimation();
            } else if (newMember && oldMember) {
                console.log("you switched channels");
                messageAnimation();
            } else {
                log.error("an error occured while checking if you left or joined a channel.");
            }
        }*/
    });

    // ---------------------------------- discord.js ERROR section --------------------------------- \\
    client.on('error', err => {
        error1 = error1 + 1;
        if (error1 == 1) {
            log.info("There has been an error!");
            log.error(err);
            //show succesfully started window
            let errorwin = new BrowserWindow({width: 1000, height: 600, frame: false});
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
            //show succesfully started window
            let errorwin = new BrowserWindow({width: 1000, height: 600, frame: false});
            errorwin.loadURL(path.join('file://', __dirname, '/error.html'));
            errorwin.on('closed', function () {
                app.exit();
            });
        }
    });
    // ---------------------------------------- END discord.js ERROR section -------------------------------- \\

    client.login(token).catch(function(err){
        log.info(err);
        logout();
    });
}


function authenticateDiscord() {

    const filter = {
      urls: ['https://discordapp.com/api/*']
    }
    authWindow = new BrowserWindow({width: 1000, height: 600, frame:false, show: false, webPreferences: { nodeIntegration: false }})
    authWindow.webContents.session.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
      //details.requestHeaders['User-Agent'] = 'MyAgent'
      const answer = { cancel: false, requestHeaders: details.requestHeaders };
      if(details.url === "https://discordapp.com/api/v6/gateway") {
        answer.cancel = true;
        token = details.requestHeaders["Authorization"];
        console.log("TOKEN: " + token);
        login();
        authWindow.close();
      }
      callback(answer);
    });

    authWindow.webContents.on('did-navigate-in-page', function (event, newUrl) {
        console.log("IN", newUrl);
        if(newUrl.startsWith("https://discordapp.com/login")) {
          authWindow.show();
        }
    });
    authWindow.loadURL("https://discordapp.com/channels/@me");
}


ipcMain.on('asynchronous-message', (event, arg, arg1) => {
    if (arg == "logout") {
        logout();
    } else if (arg == "msgcolor") {
        log.info("changed messagecolor to " + arg1);
    } else if (arg == "toggleAutoStart") {
        var AutoLauncher = new AutoLaunch({
            name: 'DiscordChroma'
        });
        AutoLauncher.isEnabled()
        .then(function(isEnabled){
            if(isEnabled){
                AutoLauncher.disable();
                config.autoStart = false;
                fs.writeFileSync(path.join(app.getPath(`userData`), 'config.json'), JSON.stringify(config))
            } else {
                AutoLauncher.enable();
                config.autoStart = true;
                fs.writeFileSync(path.join(app.getPath(`userData`), 'config.json'), JSON.stringify(config))
            }
        })
        .catch(function(err){
            // handle error
        });
    } else if (arg == "exitapp") {
        log.info("closing DiscordChroma");
        //show thx window
        let thxwin = new BrowserWindow({width: 1000, height: 600, frame: false});
        thxwin.loadURL(path.join('file://', __dirname, '/thx.html'));
        tray.destroy();
        //plays shutdown animation and exit's app at ending
        shutdownAnimation();
    }
});


function logout() {
    log.info("user logged out");
    session.defaultSession.clearStorageData({
      origin: "https://discordapp.com",
      storages: ["localstorage"]
    }, ()=> {
      token = null;
      if(client) client.destroy();
      client = new Discord.Client();
      authenticateDiscord();
    });
}


async function shutdownAnimation() {
    let instance = await chroma.Instance();
    var b = 0;
    for(g=255; g>125; g--){
        instance.setAll(new Color(0, g, b));
        await instance.send();
        b++;
        await sleep(8);
    }
    for(b;b>0;b--){
        instance.setAll(new Color(0, g, b));
        await instance.send();
        if(!g<=0){
            g--;
        }
        await sleep(8);
    }
    setTimeout(function() {
        instance.destroy();
        app.exit();
    }, 2300);
}

async function startupAnimation() {
    let instance = await chroma.Instance();
    var b = 0;
    var r = 0;
    for(g=255; g>125; g--){
        instance.setAll(new Color(r, g, b));
        await instance.send();
        b++;
        await sleep(16);
    }
    for(r; r<125; r++){
        instance.setAll(new Color(r, g, b));
        await instance.send();
        if(!g<=0){
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
    for(i;i<2;i++){
        for(r; r<255; r++){
            instance.setAll(new Color(r, 0, 0));
            await instance.send();
            await sleep(1);
        }
        for(r; r>0; r--){
            instance.setAll(new Color(r, 0, 0));
            await instance.send();
            await sleep(1);
        }
    }
    instance.destroy();
    spamProtection = false;
}


async function messageAnimation() {
    let instance = await chroma.Instance();
    instance.playAnimation(new BcaAnimation(path.join(__dirname, '/BcaAnimations/message.bca')));
    var r = 0;
    var i = 0;
    for(i;i<3;i++){
        for(r; r<255; r++){
            instance.Mouse.setAll(new Color(0, 0, r));
            await instance.send();
            await sleep(1);
        }
        for(r; r>0; r--){
            instance.Mouse.setAll(new Color(0, 0, r));
            await instance.send();
            await sleep(1);
        }
    }
    instance.destroy();
    spamProtection = false;
}

//when a "global" error occurs
process.on('unhandledRejection', err => {
    var errorcode = err.toString();
    if(!errorcode.includes("chromasdk/heartbeat failed")){
        urError = urError + 1;
        if (urError == 1) {
            log.info("There has been an error!");
            log.error(err);
            //show succesfully started window
            let errorwin = new BrowserWindow({width: 1000, height: 600, frame: false});
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
