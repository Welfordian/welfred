<template>
    <div class="flex h-full" :class="{'bg-gray-800 text-white': isDarkMode, 'bg-gray-200': !isDarkMode}">
        <div class="w-1/5 h-full" >
            <p @click="route = 'general'" class="p-3 cursor-pointer" :class="{'hover:bg-blue-300 hover:text-white': !isDarkMode, 'hover:bg-gray-600 hover:text-white': isDarkMode, 'bg-blue-400 text-white': (route === 'general' && !isDarkMode), 'bg-gray-700 text-white': (route === 'general' && isDarkMode)}">General</p>
            <p @click="route = 'plugins'" class="p-3 cursor-pointer" :class="{'hover:bg-gray-600 hover:text-white': isDarkMode, 'hover:bg-blue-300 hover:text-white': !isDarkMode, 'bg-blue-400 text-white': (route === 'plugins' && !isDarkMode), 'bg-gray-700 text-white': (route === 'plugins' && isDarkMode)}">Plugins</p>
        </div>

        <div class="w-4/5" :class="{'bg-gray-600 text-white': isDarkMode, 'bg-white': !isDarkMode}">
            <div v-if="route === 'general'" class="h-full">
                <h1 class="text-2xl pl-6 py-2 text-white" :class="{'bg-blue-400': !isDarkMode, 'bg-gray-700': isDarkMode}">General</h1>
            </div>

            <div v-if="route === 'plugins'" class="h-full flex flex-col">
                <h1 class="text-2xl pl-6 py-2 text-white" :class="{'bg-blue-400': !isDarkMode, 'bg-gray-700': isDarkMode}">Plugins</h1>

                <div class="flex flex-grow">
                    <div class="w-1/4" :class="{'bg-gray-700 text-white': isDarkMode, 'bg-gray-100': !isDarkMode}">
                        <p class="px-4 text-white py-3 cursor-pointer" :class="{'hover:bg-blue-300 hover:text-white': !isDarkMode, 'hover:bg-gray-600 hover:text-white': isDarkMode, 'bg-blue-400': (pluginPane === 'mainPluginsPane' && !isDarkMode), 'bg-gray-700': (pluginPane === 'mainPluginsPane' && isDarkMode), 'bg-gray-500': (pluginPane !== 'mainPluginsPane' && isDarkMode), 'bg-blue-500': (pluginPane !== 'mainPluginsPane' && !isDarkMode)}" @click="pluginPane = 'mainPluginsPane'">Browse</p>
                        <p class="px-4 text-white py-3 cursor-pointer" :class="{'hover:bg-blue-300 hover:text-white': !isDarkMode, 'hover:bg-gray-600 hover:text-white': isDarkMode, 'bg-blue-400': (pluginPane === k && !isDarkMode), 'bg-blue-500': (pluginPane !== k && !isDarkMode), 'bg-gray-500': (pluginPane !== k && isDarkMode)}" v-for="(a, k) in loadedPlugins" @click="pluginPane = k">{{ (' '+k).replace(/ [\w]/g, a => a.toLocaleUpperCase()).trim() }}</p>
                    </div>

                    <div class="w-3/4 pt-4 px-4 overflow-auto">
                        <div v-if="pluginPane === 'mainPluginsPane'" class="flex">
                            <div v-for="plugin in remotePlugins" class="w-1/2 mx-2 flex-grow">
                                <div class="flex flex-col justify-between shadow-lg text-white px-2 py-2 h-56" :class="{'bg-blue-500': !isDarkMode, 'bg-gray-700': isDarkMode}">
                                    <div class="flex flex-col">
                                        <div class="flex justify-center">
                                            <i class="text-4xl" :class="plugin.icon"></i>
                                        </div>

                                        <div class="flex flex-col text-center justify-center mt-3">
                                            <p class="font-bold">{{ plugin.name }}</p>
                                            <p class="mt-2">{{ plugin.description }}</p>
                                        </div>
                                    </div>

                                    <button v-if="plugin.namespace in loadedPlugins === false" class="mt-4 px-2 py-1 focus:outline-none" :class="{'bg-blue-600 hover:bg-blue-700': !isDarkMode, 'bg-gray-800 hover:bg-gray-900': isDarkMode}" @click="installPlugin(plugin)">Install</button>
                                    <button v-else class="mt-4 px-2 py-1 focus:outline-none w-full self-end" :class="{'bg-blue-600 hover:bg-blue-700': !isDarkMode, 'bg-gray-800 hover:bg-gray-900': isDarkMode}" @click="removePlugin(plugin)">Remove</button>
                                </div>
                            </div>
                        </div>

                        <div v-for="(a, k) in loadedPlugins" v-if="pluginPane === k">
                            <p class="mb-4 font-bold">{{ (' '+k).replace(/ [\w]/g, a => a.toLocaleUpperCase()).trim() }} Settings</p>

                            <div>
                                <label :for="'enable_' + k">
                                    Enabled
                                </label>

                                <input @change="togglePlugin" :checked="disabledPlugins.indexOf(k) === -1" type="checkbox" :id="'enable_' + k" />
                            </div>

                            <div v-if="'settings' in a" v-for="(p, pk) in a.settings" class="my-3">
                                <p class="mb-1">{{ pk }}</p>

                                <!-- String Input -->
                                <input v-model="tempInputs[pk]" v-if="p.type === 'string'" type="text" :name="pk" class="px-3 py-3 placeholder-gray-400 text-gray-700 relative bg-white bg-white rounded text-sm shadow outline-none focus:outline-none focus:shadow-outline w-full" />

                                <!-- Button Input -->
                                <button v-if="p.type === 'button'" @click="p.callback" :class="{'bg-blue-600 hover:bg-blue-700': !isDarkMode, 'bg-gray-800 hover:bg-gray-900': isDarkMode}" class="text-white font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1" style="transition: all .15s ease">{{ buttonText(k, pk) }}</button>
                            </div>

                            <button @click="savePluginPreferences" :class="{'bg-blue-600 hover:bg-blue-700': !isDarkMode, 'bg-gray-800 hover:bg-gray-900': isDarkMode}" class="mt-4 text-white font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1" style="transition: all .15s ease">Save</button>
                        </div>

                        <div v-if="pluginPane === false">
                            <h1 class="font-bold text-center">Choose a plugin to configure</h1>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
    const fs = require('fs');

    import settings from 'electron-settings';
    const axios = require('axios');
    const os = require ('os');
    const homedir = os.userInfo().homedir;
    import { ipcRenderer } from 'electron';

    export default {
        name: 'Preferences',

        async mounted() {
            window.settings = settings;

            this.disabledPlugins = await settings.get('disabled_plugins');

            if (this.disabledPlugins === undefined) {
                this.disabledPlugins = [];
            }

            this.loadRemotePlugins();
            this.registerPlugins();
        },

        data() {
            return {
                route: 'plugins',
                disabledPlugins: [],
                loadedPlugins: {},
                remotePlugins: [],
                pluginPane: 'mainPluginsPane',
                tempInputs: {},
                buttonTexts: {},
                http: null,
                isDarkMode: require('electron').remote.systemPreferences.isDarkMode()
            }
        },

        computed: {
            buttonText: (app) => (k, pk) => {
                return app.buttonTexts[k][pk]
            }
        },

        beforeMount() {
            this.http = axios.create();

            ipcRenderer.on('plugin_deleted', this.registerPlugins);
            ipcRenderer.on("download complete", this.registerPlugins);

            require('electron').remote.systemPreferences.subscribeNotification('AppleInterfaceThemeChangedNotification', () => {
                this.isDarkMode = require('electron').remote.systemPreferences.isDarkMode();
            });
        },

        methods: {
            removePlugin(plugin) {
                ipcRenderer.send('delete_plugin', {
                    directory: `${homedir}/.welfred/plugins/${plugin.namespace}/`
                });
            },

            installPlugin(plugin) {

                ipcRenderer.send("download", {
                    url: plugin.download_url,
                    properties: {
                        directory: `${homedir}/.welfred/plugins/${plugin.namespace}/`
                    }
                });
            },

            loadRemotePlugins() {
                this.http.get('https://api.github.com/repos/welfordian/welfred-plugins/contents').then(({data}) => {
                    data.forEach(d => {
                        if (d.type === 'dir') {
                            let plugin = {
                                namespace: d.name
                            };

                            this.http.get(d.url).then(({data}) => {
                                let pluginJson = data.filter(r => {
                                    return r.name === "plugin.json";
                                })[0];

                                let remotePlugin = data.filter(r => {
                                    return r.name === "index.js";
                                })[0];

                                this.http.get(pluginJson.download_url + '?time=' + (new Date()).getTime()).then(({data}) => {
                                    plugin['name'] = data.name;
                                    plugin['description'] = data.description;
                                    plugin['icon'] = data.icon;
                                    plugin['download_url'] = remotePlugin.download_url;

                                    this.remotePlugins.push(plugin);
                                });
                            })
                        }
                    })
                });
            },

            togglePlugin() {
                if (this.disabledPlugins.indexOf(this.pluginPane) === -1) {
                    this.disabledPlugins.push(this.pluginPane);
                } else {
                    this.disabledPlugins.splice(this.disabledPlugins.indexOf(this.pluginPane), 1);
                }
            },

            registerPlugins() {
                this.loadedPlugins = {};
                fs.readdir(homedir + '/.welfred/plugins', (err, files) => {
                    files.forEach(f => {
                        if (f === '.DS_Store') return;

                        let pluginName = f.replace('.js', '');

                        this.$set(this.loadedPlugins, pluginName, global.require(homedir + '/.welfred/plugins/' + f + '/index.js')(global.require));

                        if ('settings' in this.loadedPlugins[pluginName]) {
                            Object.keys(this.loadedPlugins[pluginName].settings).forEach((a, k) => {
                                let s = this.loadedPlugins[pluginName].settings[a];

                                if (s.hasOwnProperty('buttonText')) {
                                    if (s.buttonText().constructor.name === "Promise") {
                                        s.buttonText().then((r) => {
                                            this.buttonTexts[pluginName] = {
                                                [a]: r
                                            };
                                        });
                                    } else if (s.buttonText().constructor.name === "Function") {
                                        this.buttonTexts[pluginName] = {
                                            [a]: s.buttonText()
                                        };
                                    }
                                }
                            })
                        }
                    });
                });
            },

            async savePluginPreferences() {
                settings.set('disabled_plugins', this.disabledPlugins).then((a) => {
                    settings.set('plugins.' + this.pluginPane, this.tempInputs).then((a) => {
                        this.loadedPlugins[this.pluginPane].boot();
                    }).catch((a) => {
                        //
                    });
                }).catch((e) => {});
            }
        },

        watch: {
            pluginPane(n, o) {
                this.tempInputs = {};

                if (! this.loadedPlugins[n].hasOwnProperty('settings')) return;

                Object.keys(this.loadedPlugins[n].settings).forEach(i => {
                    if ('default' in this.loadedPlugins[n].settings[i]) {
                        this.$set(this.tempInputs, i, this.loadedPlugins[n].settings[i].default);
                    }

                    settings.get('plugins.' + this.pluginPane + '.' + i).then(v => {
                        if (v !== undefined) {
                            this.$set(this.tempInputs, i, v);
                        }
                    });
                });
            }
        }
    }
</script>

<style>
    html, body, #app {
        width: 100%;
        height: 100%;
    }
</style>