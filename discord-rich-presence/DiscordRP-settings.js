const RPC = require('discord-rpc')
const client = new RPC.Client({ transport: 'ipc' })

client.on('ready', () => {
    client.setActivity({
        state: 'By DELUUXE',
        details: 'Discord integration for Razer Chroma (unofficial)',
        state: 'Editing some settings',
        largeImageKey: 'discordchroma',
        largeImageDetails: "DiscordChroma",
        instance: true,
    })

    client.on('error', function (error) {
        console.log(error)
        client.clearActivity()
        client.destroy()
        process.exit(0)
    })
})

process.on('exit', () => {
    client.clearActivity()
    client.destroy()
})

client.login({ clientId: '653623540649820181' })