const RPC = require('discord-rich-presence')('409416236519260171');

RPC.updatePresence({
    state: 'By DELUUXE.NL',
    details: 'integration for RazerChroma',
    largeImageKey: 'discordchroma',
    largeImageDetails: "DiscordChroma",
    instance: true,
});

RPC.on('error', function(error){
    console.log(error);
});