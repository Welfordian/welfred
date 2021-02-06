# Welfred

This is an Alfred clone writted in NodeJS with Electron.

This really wasn't created to be used by anyone or for anyone to look at the ugly, horrible mess of code, I just needed somewhere to store it.

This application is also capable of loading plugins (stored in the `~/.welfred/plugins` directory.)

An example plugin is shown below. This plugin is used to control Spotify.

The file contents would be stored at `~/.welfred/plugins/spotify/index.js`.

```javascript
    module.exports = (require) => {
        const applescript = require('applescript');
        const { ipcRenderer } = require('electron');
        const axios = require('axios');
        const moment = require('moment');
        const settings = require('electron-settings');
    
        let clientId;
        let pluginTerm = '/s';
        let clientSecret;
    
        const Spotify = {
            term: pluginTerm,
            description: 'Control Spotify from Welfred',
    
            settings: {
                invokeTerm: {
                    type: 'string',
                    default: '/s'
                },
                clientId: {
                    type: 'string'
                },
                clientSecret: {
                    type: 'string'
                },
                login: {
                    type: 'button',
    
                    async buttonText() {
                        return await settings.get('plugins.spotify.logged_in')
                            ? "Logout"
                            : "Login";
                    },
    
                    callback() {
                        require('electron').shell.openExternal('https://google.com');
                    }
                }
            },
    
            async boot() {
                clientId = await settings.get('plugins.spotify.clientId');
                clientSecret = await settings.get('plugins.spotify.clientSecret');
                pluginTerm = await settings.get('plugins.spotify.invokeTerm');
    
                if (pluginTerm === undefined) {
                    pluginTerm = '/s';
                }
    
                Spotify.term = pluginTerm;
            },
    
            internal: {
                async client() {
                    await Spotify.internal.verifyAccessToken();
    
                    return axios.create({
                        baseURL: 'https://api.spotify.com/v1/',
                        headers: {
                            Authorization: 'Bearer ' + Spotify.internal.accessToken.access_token
                        }
                    })
                },
    
                accessToken: null,
    
                accessTokenExpired() {
                    return moment().isAfter(Spotify.internal.accessToken.expiresAt);
                },
    
                verifyAccessToken() {
                    return new Promise((resolve, reject) => {
                        if (Spotify.internal.accessToken === null || Spotify.internal.accessTokenExpired()) {
                            axios({
                                method: "post",
                                url: 'https://accounts.spotify.com/api/token',
                                data: "grant_type=client_credentials",
                                headers: {
                                    Accept: "application/json",
                                    "Content-Type": "application/x-www-form-urlencoded",
                                },
                                auth: {
                                    username: clientId, // User ID
                                    password: clientSecret,  // User Secret
                                },
                            }).then(({data}) => {
                                Spotify.internal.accessToken = data;
    
                                Spotify.internal.accessToken.expiresAt = moment().add(Spotify.internal.accessToken.expires_in, 'seconds');
    
                                resolve();
                            }).catch((err) => {    
                                reject();
                            });
                        } else {
                            resolve();
                        }
                    });
                }
            },
    
            commands: {
                play: {
                    description: 'Resume Spotify playback or queue a song',
    
                    handle(track = false) {
                        if (! track) {
                            const script = `tell application "Spotify" to play`;
    
                            applescript.execString(script, (err, rtn) => {
                                if (err) {
                                    ipcRenderer.send('log', err);
                                }
    
                                if (Array.isArray(rtn)) {
                                    for (const songName of rtn) {
                                        ipcRenderer.send('log', songName);
                                    }
                                } else {
                                    ipcRenderer.send('log', rtn);
                                }
                            });
                        } else {
                            Spotify.commands.track.handle(track);
                        }
                    }
                },
    
                pause: {
                    description: 'Pause Spotify playback',
                    async handle() {
                        const script = `tell application "Spotify" to pause`;
    
                        applescript.execString(script, (err, rtn) => {
                            if (err) {
                                ipcRenderer.send('log', err);
                            }
    
                            if (Array.isArray(rtn)) {
                                for (const songName of rtn) {
                                    ipcRenderer.send('log', songName);
                                }
                            } else {
                                ipcRenderer.send('log', rtn);
                            }
                        });
                    }
                },
    
                track: {
                    async handle(track) {
                        let client = await Spotify.internal.client();
    
                        client.get('search', {
                            params: {
                                q: track,
                                type: 'track'
                            }
                        }).then(({data}) => {
                            const script =
                                `tell application "Spotify"
                            play track "${data.tracks.items[0].uri}"
                        end tell`;
    
                            applescript.execString(script, (err, rtn) => {
                                if (err) {
                                    ipcRenderer.send('log', err);
                                }
    
                                if (Array.isArray(rtn)) {
                                    for (const songName of rtn) {
                                        ipcRenderer.send('log', songName);
                                    }
                                } else {
                                    ipcRenderer.send('log', rtn);
                                }
                            });
                        });
                    }
                }
            }
        };
    
        return Spotify;
    }
```

I have also created a plugin which enables a mini YouTube player with a built-in queue.

The contents of this file would be stored at `~/.welfred/plugins/youtube/index.js`

See the code below:-

```javascript
module.exports = (require) => {
    const { ipcRenderer } = require('electron');
    const axios = require('axios');
    const settings = require('electron-settings');

    const YouTube = {
        term: '/yt',

        icon: 'youtube',

        settings: {
            "YouTube Authentication": {
                type: 'button',

                async buttonText() {
                    return await settings.get('plugins.youtube.logged_in') === undefined
                        ? "Login to YouTube"
                        : "Logout of YouTube";
                },

                async callback() {
                    ipcRenderer.on('youtube::login::did-navigate', (e, {url}) => {
                        if (url.indexOf('access_token') === -1) return;

                        let contents = JSON.parse('{"' + decodeURI(url.substring(url.indexOf('#')+1)).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g,'":"') + '"}');

                        if (contents.hasOwnProperty('state')) {
                            if (contents.state === 'youtube') {
                                (async () => {
                                    await settings.set('plugins.youtube.logged_in', contents.access_token);

                                    window.location.reload();

                                    ipcRenderer.send('youtube::login::close');
                                })();
                            }
                        }
                    });

                    if (await settings.get('plugins.youtube.logged_in') === undefined) {
                        const clientId = "<<CLIENT_ID>>";
                        const redirectUri = 'https://welfordian.github.io/youtube-embed-proxy/youtube-login';
                        const scope = 'https://www.googleapis.com/auth/youtube';

                        window.open(`https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}&state=youtube`, 'youtube::login');
                    } else {
                        await settings.unset('plugins.youtube.logged_in');

                        window.location.reload();
                    }
                }
            }
        },

        commands: {
            play: {
                icon: 'play',

                description: "Play a YouTube video",

                async handle(term) {
                    let videoId;

                    if (/(?:https?:\/\/)?(?:youtu\.be\/|(?:www\.)?youtube\.com\/watch(?:\.php)?\?.*v=)([a-zA-Z0-9\-_]+)/.test(term)) {
                        videoId = /(youtu\.be\/|youtube\.com\/(watch\?(.*&)?v=|(embed|v)\/))([^\?&"'>]+)/.exec(term)[5];
                    } else {
                        const url = "https://www.googleapis.com/youtube/v3/search?maxResults=1&key=<<API_KEY>>&maxResults=1&q=" + term + "&type=video&part=snippet";

                        videoId = await (await axios.get(url)).data.items[0].id.videoId;
                    }

                    ipcRenderer.send('open-window', {
                        name: 'youtube-player',
                        url: 'https://youtube-embed-proxy.test/index.vue.html#' + videoId,
                        width: 470,
                        height: 275,
                        position: 'bottomRight',
                        alwaysOnTop: true,
                    });

                    ipcRenderer.send('set-touchBar', {
                        name: 'youtube-player',
                        items: [
                            {
                                type: 'button',
                                label: 'Play',
                                callback: 'youtube::playPause'
                            }
                        ]
                    });
                }
            },

            search: {
                icon: 'search',

                description: "Search YouTube for...",

                handle(term) {
                    require('electron').shell.openExternal('https://www.youtube.com/results?search_query=' + term);
                }
            },

            sleep: {
                icon: 'alarm-clock',
                description: "A dummy command for testing..."
            }
        }
    }

    return YouTube;
}
```