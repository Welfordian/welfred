import {app, BrowserWindow, session, globalShortcut, Menu, screen, Tray, TouchBar, protocol } from 'electron'
const { TouchBarButton, TouchBarSpacer } = TouchBar;
const path = require('path');
const ipc = require('electron').ipcMain;
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer';
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import { autoUpdater } from "electron-updater";
const {download} = require("electron-dl");
const rimraf = require('rimraf');

app.commandLine.appendSwitch ("disable-http-cache");

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

import { ElectronBlocker } from '@cliqz/adblocker-electron';

import fetch from 'cross-fetch'; // required 'fetch'

ElectronBlocker.fromPrebuiltFull(fetch).then((blocker) => {
  blocker.enableBlockingInSession(session.defaultSession);
});

app.commandLine.appendSwitch('widevine-cdm-path', '/Applications/Google Chrome.app/Contents/Frameworks/Google Chrome Framework.framework/Versions/87.0.4280.88/Libraries/WidevineCdm/_platform_specific/mac_x64');
app.commandLine.appendSwitch('widevine-cdm-version', '4.10.1610.0')

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let pluginWindows = {}, preferences, mainWindow, tray, winURL;

if (process.env.NODE_ENV === 'development') {
  winURL = process.env.WEBPACK_DEV_SERVER_URL;
} else {
  winURL = `app://./index.html`;
}

autoUpdater.checkForUpdatesAndNotify();

function createPreferencesWindow() {
  preferences = new BrowserWindow({
    height: 700,
    width: 1000,
    center: true,
    resizable: false,
    title: 'Preferences',
    webPreferences: {
      nodeIntegration: true,
      webSecurity: false,
      enableRemoteModule: true,
      nativeWindowOpen: true,
      devTools: process.env.NODE_ENV === 'development'
    }
  })

  preferences.on('page-title-updated', function(e) {
    e.preventDefault()
  });

  preferences.webContents.on('new-window', (event, url, frameName, disposition, options, additionalFeatures) => {
    event.preventDefault();

    event.newGuest = new BrowserWindow(options);

    preferences.webContents.send(frameName + '::opened');

    event.newGuest.webContents.on('did-navigate', (e, url) => {
      preferences.webContents.send(frameName + '::did-navigate', {url});
    });

    event.newGuest.loadURL(url, {userAgent: 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.10136"'});

    ipc.on(frameName + '::close', () => {
      event.newGuest.close();
    })
  });

  preferences.loadURL(winURL + '#preferences');
}

function createWindow () {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    frame: false,
    transparent: true,
    height: 620,
    useContentSize: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    width: 560,
    show: false,
    titleBarStyle: 'hidden-inset',
    registerURLSchemeAsSecure:'file://',
    registerURLSchemeAsBypassingCSP: 'file://',
    registerURLSchemeAsPrivileged : 'file://',
    clickThrough: 'pointer-events',
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      devTools: process.env.NODE_ENV === 'development',
      //nativeWindowOpen: true
    }
  });

  mainWindow.setSkipTaskbar(true);

  let display = screen.getPrimaryDisplay();
  let width = display.bounds.width;

  mainWindow.setPosition(width/2-280, 100, true);

  mainWindow.on('close', function(event) {
    mainWindow.hide();
    event.preventDefault();
  })

  mainWindow.loadURL(winURL);

  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.on("did-frame-finish-load", () => {
      mainWindow.webContents.once("devtools-opened", () => {
        mainWindow.focus();
      });

      //mainWindow.webContents.openDevTools();
    });
  }

  mainWindow.focus();
}

if (process.platform === 'darwin') {
  app.dock.hide();
}

app.whenReady().then(() => {
  installExtension(VUEJS_DEVTOOLS)
      .then((name) => console.log(`Added Extension:  ${name}`))
      .catch((err) => console.log('An error occurred: ', err));
});

app.on('ready', () => {
  createProtocol('app');

  createWindow();

  globalShortcut.register('Control+Shift+I', () => {
    // When the user presses Ctrl + Shift + I, this function will get called
    // You can modify this function to do other things, but if you just want
    // to disable the shortcut, you can just return false
    return false;
  });


  globalShortcut.register('Option+Space', function () {
    if (! mainWindow) {
      createWindow();
    } else {
      mainWindow.show();
      mainWindow.webContents.focus();
    }
  });

  tray = new Tray(path.join(__dirname, "tray.png"));

  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: 'Preferences',
      click: () => {
        createPreferencesWindow()
      }
    },
    {
      label: 'Quit',
      click: function () {
        app.exit(0);
      }
    }
  ]));
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
});

ipc.on("download", (event, info) => {
  download(BrowserWindow.getFocusedWindow(), info.url, info.properties)
      .then(dl => preferences.webContents.send("download complete", dl.getSavePath()));
});

ipc.on('getDirName', (e) => {
  e.sender.send('gotDirName', {dirname: __dirname, static: __static});
});

ipc.on('hideMainWindow', () => {
  mainWindow.hide();
});

ipc.on('open-window', (e, opts) => {
  if (! 'name' in opts) return;

  if (opts.name in pluginWindows) {
    pluginWindows[opts.name].window.webContents.send('open-window', opts);
  } else {
    let display = screen.getPrimaryDisplay();
    let width = display.bounds.width;
    let height = display.bounds.height;

    let defaults = {
      frame: false,
      transparent: true,
      height: 66,
      useContentSize: true,
      alwaysOnTop: false,
      width: 560,
      titleBarStyle: 'hidden-inset',
      registerURLSchemeAsSecure:'file://',
      registerURLSchemeAsBypassingCSP: 'file://',
      registerURLSchemeAsPrivileged : 'file://',
      clickThrough: 'pointer-events',
      webPreferences: {
        nodeIntegration: true,
        enableRemoteModule: true,
        nativeWindowOpen: true,
        devTools: process.env.NODE_ENV === 'development'
      }
    };

    const config = Object.assign(defaults, opts);

    pluginWindows[opts.name] = {window: new BrowserWindow(config)};

    pluginWindows[opts.name].window.loadURL(opts.url);

    if ('position' in config) {
      if (config.position === 'bottomRight') {
        pluginWindows[opts.name].window.setPosition((width - config.width) - 25, (height - config.height) - 100, true);
      }
    }

    ipc.on(opts.name + '::toggleAlwaysOnTop', (e, {alwaysOnTop}) => {
      pluginWindows[opts.name].window.setAlwaysOnTop(alwaysOnTop);
    });

    pluginWindows[opts.name].window.webContents.session.webRequest.onHeadersReceived({ urls: [ "*://*/*" ] },
        (d, c)=>{
          if(d.responseHeaders['X-Frame-Options']){
            delete d.responseHeaders['X-Frame-Options'];
          } else if(d.responseHeaders['x-frame-options']) {
            delete d.responseHeaders['x-frame-options'];
          }

          c({cancel: false, responseHeaders: d.responseHeaders});
        }
    );

    if (process.env.NODE_ENV === "development") {
      pluginWindows[opts.name].window.webContents.on("did-frame-finish-load", () => {
        pluginWindows[opts.name].window.webContents.once("devtools-opened", () => {
          pluginWindows[opts.name].window.focus();
        });
      });
    }

    pluginWindows[opts.name].window.on('close', () => {
      delete pluginWindows[opts.name];
    });
  }
});

ipc.on('delete_plugin', (e, opts) => {
  rimraf(opts.directory, {}, function () {
    preferences.webContents.send('plugin_deleted');
  });
});

ipc.on('set-touchBar', (e, opts) => {
  if ('items' in opts) {
    if (opts.items.constructor.name === 'Array') {
      let items = [];

      opts.items.forEach(opt => {

        if (opt.type === 'button') {
          items.push(new TouchBarButton({
            label: opt.label,
            click: () => {
              pluginWindows[opts.name].window.webContents.send(opt.callback);
            }
          }));
        }


      });

      pluginWindows[opts.name].touchBar = new TouchBar({
        items
      });

      pluginWindows[opts.name].window.setTouchBar(pluginWindows[opts.name].touchBar);

    }
  }
});

/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

/*
import { autoUpdater } from 'electron-updater'

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})

app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
})
 */