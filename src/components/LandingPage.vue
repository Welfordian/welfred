<template>
    <div id="main" @keydown="navigateApps" @keyup.esc.prevent="closeWindow" class="m-4">
        <div class="relative flex w-full flex-wrap items-stretch">
            <input autofocus placeholder="Welfred" @keyup="searchApps" ref="searchTerm" type="text" v-model="searchTerm" class="bg-transparent px-3 py-4 placeholder-gray-400 text-gray-700 relative rounded text-base outline-none focus:outline-none focus:shadow-outline w-full pr-10 text-2xl"/>

            <span class="leading-normal font-normal absolute text-center text-gray-400 absolute bg-transparent rounded text-lg items-center justify-center w-8 right-0 text-3xl pt-2 pr-2 font-bold text-gray-600">
                <i class="fab fa-searchengin"></i>
            </span>
        </div>

        <with-keyboard-control ref="keyboardControl" :listLength="searchResults.length" @selected="selectedHandler" :selected-index="selectedIndex" id="applicationList" class="outline-none overflow-auto" tabindex="0">
            <template slot-scope="{selectedIndex}">
                <div
                        v-for="(item, index) in searchResults"
                        class="list-item p-2"
                        :class="{'selected': index === selectedIndex}"
                        :key="index">
                    <div class="flex items-center cursor-pointer" @mouseenter="setSelectedIndex(index)" @click="selectedHandler(index)">
                        <img class="mr-2" :src="item.image" />
                        <div>
                            <p class="flex items-center"><i v-if="'icon' in item" :class="'fas fa-' + item.icon"></i> <span :class="{'ml-2': 'icon' in item}">{{ item.name }}</span></p>
                            <p class="application-path text-sm pr-3 overflow-ellipsis overflow-hidden whitespace-nowrap w-96">{{ item.path }}</p>
                        </div>
                    </div>
                </div>
            </template>
        </with-keyboard-control>
    </div>
</template>

<script>
    const setIgnoreMouseEvents = require('electron').remote.getCurrentWindow().setIgnoreMouseEvents;
    import WithKeyboardControl from "./WithKeyboardControl";

    const exec = require('child_process').exec;
    const { shell } = require('electron');
    import { ipcRenderer } from 'electron';
    const fs = require('fs');
    import settings from 'electron-settings';
    const os = require ('os');
    const homedir = os.userInfo().homedir;
    const path = require('path');
    const fg = require('fast-glob');
    window.fg = fg;

    const findApps = function(dir, done) {
        var results = [];

        fs.readdir(dir, function(err, list) {
            if (err) return done(err);
            let pending = list.length;
            if (!pending) return done(null, results);
            list.forEach(function(file) {
                file = path.resolve(dir, file);
                fs.stat(file, function(err, stat) {
                    if (stat && stat.isDirectory() && file.endsWith('.app') === false) {
                        findApps(file, function(err, res) {
                            res = res.filter(r => r.endsWith('.app'));
                            results = results.concat(res);
                            if (!--pending) done(null, results);
                        });
                    } else {
                        if (file.endsWith('.app')) {
                            results.push(file);
                        }
                        if (!--pending) done(null, results);
                    }
                });
            });
        });
    };

    export default {
        components: {
            WithKeyboardControl
        },

        mounted() {
            ipcRenderer.send('getDirName');

            ipcRenderer.on('gotDirName', (e, data) => {
                console.log(data);
            });
            window.addEventListener('mousemove', event => {
                if (event.path.includes(document.querySelector('#main')) === false) {
                    setIgnoreMouseEvents(true, {forward: true})   // {forward: true} keeps generating MouseEvents
                } else {
                    setIgnoreMouseEvents(false)
                }
            });

            this.$refs.searchTerm.focus();

            this.cacheApps();

            document.body.onkeydown = e => {
                if (e.keyCode === 40) {
                    document.querySelector('#applicationList').focus();
                }
            }

            window.onblur = () => {
                //this.closeWindow();
            }

            window.onerror = e => {
                ipcRenderer.send('log', e);
            }

            this.registerPlugins();

            window.onfocus = () => {
                this.registerPlugins();
            }
        },

        data() {
            return {
                selectedIndex: 0,
                searchTerm: '',
                applications: [],
                searchResults: [],
                loadedPlugins: {},
            }
        },

        methods: {
            setSelectedIndex(index) {
                this.$refs.keyboardControl.selectedIndex = index;
            },

            async registerPlugins() {
                let disabledPlugins = await settings.get('disabled_plugins');

                if (disabledPlugins === undefined) {
                    disabledPlugins = [];
                }

                fs.readdir(homedir + '/.welfred/plugins', (err, files) => {
                    if (files === undefined) return;
                    
                    files.forEach(f => {
                        let pluginName = f.replace('.js', '');

                        if (disabledPlugins.indexOf(pluginName) === -1) {
                            this.loadedPlugins[pluginName] = global.require(homedir + '/.welfred/plugins/' + f + '/index.js')(global.require);

                            if (this.loadedPlugins[pluginName].hasOwnProperty('boot')) {
                                this.loadedPlugins[pluginName].boot();
                            }
                        }
                    });
                });
            },

            applicationImage(path) {
                return new Promise((resolve, reject) => {
                    require('electron').nativeImage.createThumbnailFromPath(path, { width: 50, height: 50 })
                        .then((i) => { resolve(i.toDataURL()); })
                        .catch(() => {  });
                });
            },

            exec(cmd, callback) {
                exec(cmd, (error, stdout, stderr) => {
                    callback(stdout);
                });
            },

            cacheApps() {
                if (require('electron').remote.process.platform === 'darwin') {
                    this.findMacApps();
                } else {
                    this.findWindowsApp();
                }
                
            },

            findWindowsApp() {
                
            },

            findMacApps() {
                findApps('/Applications', (e, r) => {
                    this.applications = r.map(a => {
                        return {path: a, name: /([^/]+$)/.exec(a)[0].replace('.app', ''), image: ''};
                    });

                    findApps(homedir + '/Applications', (e, r) => {
                        this.applications = this.applications.concat(r.map(a => {
                            return {path: a, name: /([^/]+$)/.exec(a)[0].replace('.app', ''), image: ''};
                        }));

                        this.applications.forEach((a, index) => {
                            this.applicationImage(a.path + '/Contents/Resources/AppIcon.icns').then((image) => {
                                this.applications[index].image = image;
                            });
                        });

                        this.applications.filter(a => {
                            return a.image === "";
                        }).forEach(a => {
                            fg([a.path + '/Contents/Resources/*.icns']).then(r => {
                                if (r.length) {
                                    this.applicationImage(r[0]).then((image) => {
                                        a.image = image;
                                    });
                                }
                            });
                        });
                    });
                });
            },

            selectedHandler(index) {
                if (this.searchResults.length) {
                    if (this.searchResults[index] === undefined) return;

                    if ('selectable' in this.searchResults[index] === false) {
                        shell.openPath(this.searchResults[index].path);

                        this.closeWindow();
                    } else {
                        this.searchTerm = this.searchResults[index].term + ' ' + this.searchResults[index].name + ' ';

                        this.$refs.searchTerm.focus();
                    }
                }
            },

            searchApps(e) {
                if (e.keyCode === 13) {
                    this.performSearch();
                }

                if (e.keyCode === 40) {
                    document.querySelector('#applicationList').focus();
                }

                if (this.searchTerm.length === 0) {
                    this.searchResults = [];

                    return;
                }

                let regex = new RegExp(this.searchTerm + '.*', 'gi');

                this.searchResults = this.applications.filter(a => { return regex.test(a.path) }).slice(0, 5);

                let parts = this.searchTerm.split(' ');
                let term = parts[0];

                let plugin = Object.keys(this.loadedPlugins).filter(p => {
                    return this.loadedPlugins[p].term === term;
                }).map(p => {
                    return this.loadedPlugins[p];
                })[0];

                if (plugin) {
                    if (parts.length > 1 && parts.length < 3) {
                        let command = parts[1] + '.*';
                        let commandRegex = new RegExp(command);

                        Object.keys(plugin.commands).filter(value => commandRegex.test(value)).forEach(k => {
                            this.searchResults.push({
                                selectable: false,
                                term: plugin.term,
                                name: k,
                                path: plugin.commands[k].description,
                                icon: plugin.commands[k].icon,
                            });
                        });
                    }
                }
            },

            navigateApps(e) {

            },

            performSearch() {
                let gotTerm = false;

                if (this.searchResults.length > 0) {
                    if (this.searchResults[0].selectable === false) {
                        this.$refs.searchTerm.focus();

                        return;
                    };

                    this.selectedHandler(0);

                    gotTerm = true;
                }

                if (/([^\s]+)/.test(this.searchTerm) && !gotTerm) {
                    let parts = this.searchTerm.split(' ');
                    let term = parts[0];
                    let command = parts[1];
                    parts.splice(0, 2);
                    let _arguments = parts.join(' ');

                    let plugin = Object.keys(this.loadedPlugins).filter(p => {
                        return this.loadedPlugins[p].term === term;
                    }).map(p => {
                        return this.loadedPlugins[p];
                    })[0];

                    if (plugin) {
                        if (plugin.commands.hasOwnProperty(command)) {
                            gotTerm = true;

                            plugin.commands[command].handle(_arguments);
                        }
                    }
                }

                if (! gotTerm) {
                    shell.openExternal('https://www.google.com/search?q=' + this.searchTerm);
                }

                this.closeWindow();
            },

            closeWindow() {
                this.searchTerm = "";
                this.searchResults = [];

                ipcRenderer.send('hideMainWindow');
            }
        }
    }
</script>

<style scoped>
    #applicationList {
        max-height: 33.5rem;
    }

    #applicationList::-webkit-scrollbar {
        width: 5px;
    }

    #applicationList::-webkit-scrollbar-corner {
        background: rgba(0,0,0,0);
    }

    #applicationList::-webkit-scrollbar-thumb {
        background-color: #ccc;
        border-radius: 0px;
        border: none;
        background-clip: content-box;
        min-width: 32px;
        min-height: 32px;
    }

    #applicationList::-webkit-scrollbar-track {
        background-color: rgba(0,0,0,0);
    }

    #main {
        background: #fffffff2;
    }

    .list-item .application-path {
        color: darkgray;
    }

    .list-item.selected, .list-item.selected .application-path {
        background: #286ED6;
        color: white;
    }

    body {
        pointer-events: none;
    }
</style>