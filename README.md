# DiscordChroma ![Logo](https://i.imgur.com/fRpCwBf.png=10px "DiscordChroma")

This is an unofficial discord integration for razer chroma products.
Still in development.

## IMPORTANT
This application uses the discord RPC api which is currently whitelist only, that means that you need to make your own "discord application".

## Features

- auto updates
- animations for discord notifications (more animations to come)
- once running you won't even notice that its there. (your normal chroma profiles will be active until a discord event is received)

## How to install

Download installer from the releases page and run it (windows will warn you before installing, but this is because i need a special certificate to "sign the code", which i don't have).\
_You need a discord application / client id, see the next section for a guide_

## how to make a discord application

_This is used for authenticating to discord, client IDs and / or secrets are only stored locally_

1. go to [the discord developer console](https://discordapp.com/developers/applications)
2. login first if you haven't done so already
3. click on "New application" in the top right
4. enter a name for your application, generally "discord-chroma-[username here]" would be fine, and still identifiable as DiscordChroma for when you need to authorize your app
5. upload the DiscordChroma logo as app icon if you like, you can get it from [this link](https://i.imgur.com/fRpCwBf.png)
6. click on the "OAuth2" tab on the left
7. click on "Add Redirect"
8. paste "``http://localhost:1608/rzr-discord-chroma-callback``" in the new redirect text box (without the quotation marks)
9. click on the green "Save Changes" button at the bottom of the window
10. click on the "General Information" tab on the left
10. copy the client id from here when DiscordChroma asks for it
11. copy the client secret from here when DiscordChroma asks for it

## How to uninstall

Once installed it's in your programs list, you can uninstall it from there or go to appdata/local/programs/DiscordChroma and run the uninstaller


### Created by DELUUXE

#### Special thanks to:
- WolfspiritM (github and razer insider)
