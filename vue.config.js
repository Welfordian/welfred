module.exports = {
    runtimeCompiler: true,

    "transpileDependencies": [
        "vuetify"
    ],

    pluginOptions: {
        electronBuilder: {
            nodeIntegration: true,
            externals: ['applescript', 'axios', 'moment', 'electron-settings'],
            builderOptions: {
                publish: ['github']
            }
        }
    },

    configureWebpack: {
        resolve: {
            symlinks: false
        }
    }
}