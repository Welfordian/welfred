<template>
    <div class="flex h-full">
        <div class="w-1/5 h-full">
            <p @click="route = 'general'" class="p-3 hover:bg-blue-300 hover:text-white cursor-pointer" :class="{'bg-blue-400 text-white': route === 'general'}">General</p>
            <p @click="route = 'plugins'" class="p-3 hover:bg-blue-300 hover:text-white cursor-pointer" :class="{'bg-blue-400 text-white': route === 'plugins'}">Plugins</p>
        </div>

        <div class="w-4/5 bg-gray-200">
            <div v-if="route === 'general'" class="h-full">
                <h1 class="text-2xl pl-6 py-2 bg-blue-400 text-white">General</h1>
            </div>

            <div v-if="route === 'plugins'" class="h-full flex flex-col">
                <h1 class="text-2xl pl-6 py-2 bg-blue-400 text-white">Plugins</h1>

                <div class="flex flex-grow">
                    <div class="w-1/4 bg-gray-100">
                        <p class="px-4 bg-blue-500 text-white py-3 cursor-pointer hover:bg-blue-400" v-for="(a, k) in loadedPlugins" @click="pluginPane = k">{{ (' '+k).replace(/ [\w]/g, a => a.toLocaleUpperCase()).trim() }}</p>
                    </div>

                    <div class="w-3/4 pt-4 px-4 overflow-auto">
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
                                <button v-if="p.type === 'button'" @click="p.callback" class="hover:bg-blue-600 bg-blue-500 text-white active:bg-blue-600 font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1" style="transition: all .15s ease">{{ buttonText(k, pk) }}</button>
                            </div>

                            <button @click="savePluginPreferences" class="mt-4 hover:bg-blue-600 bg-blue-500 text-white active:bg-blue-600 font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1" style="transition: all .15s ease">Save</button>
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
    const os = require ('os');
    const homedir = os.userInfo().homedir;

    export default {
        name: 'Preferences',

        async mounted() {
            window.settings = settings;

            this.disabledPlugins = await settings.get('disabled_plugins');

            if (this.disabledPlugins === undefined) {
                this.disabledPlugins = [];
            }

            this.registerPlugins();
        },

        data() {
            return {
                route: 'plugins',
                disabledPlugins: [],
                loadedPlugins: {},
                pluginPane: false,
                tempInputs: {},
                buttonTexts: {},
            }
        },

        computed: {
            buttonText: (app) => (k, pk) => {
                return app.buttonTexts[k][pk]
            }
        },

        methods: {
            togglePlugin() {
                if (this.disabledPlugins.indexOf(this.pluginPane) === -1) {
                    this.disabledPlugins.push(this.pluginPane);
                } else {
                    this.disabledPlugins.splice(this.disabledPlugins.indexOf(this.pluginPane), 1);
                }
            },

            registerPlugins() {
                fs.readdir(homedir + '/.welfred/plugins', (err, files) => {
                    files.forEach(f => {
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
                }).catch((e) => {
                    console.log(e);
                });
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