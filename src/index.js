const { GuildMember } = require("discord.js");
const Discord = require("discord.js");
const Client = require("./client");
const { Player } = require("discord-player");
const { QueryType } = require("discord-player");
const { prefix, token } = require("./config");
const ytdl = require("ytdl-core");
const { joinVoiceChannel, createAudioPlayer, AudioPlayerStatus, AudioResource, createAudioResource } = require('@discordjs/voice');
// const { options } = require("./play");

// const client = new Discord.Client();
const client = new Client();
const discordPlayer = new Player(client);

const queue = new Map();
let songResultMap = new Map();


client.once("ready", () => {
    console.log("Ready!");
});

client.once("reconnecting", () => {
    console.log("Reconnecting!");
});

client.once("disconnect", () => {
    console.log("Disconnect!");
});

client.on("messageCreate", async message => {

    if (message.author.bot) {
        if (!isNaN(message.content.charAt(3)) || message.content.includes("> ")) {
            message.suppressEmbeds(true);
        }
        // if (message.content.indexOf("https://") !== message.content.lastIndexOf("https://")) {
        //     message.suppressEmbeds(true);
        // } else if (!isNaN(message.content.charAt(3)) || message.content.includes("> ")) {
        //     message.suppressEmbeds(true);

        // }
    };
    if (!message.content.startsWith(prefix)) return;

    const serverQueue = queue.get(message.guild.id);

    if (message.content.startsWith(`${prefix}p`)) {
        search(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix}skip`)) {
        skip(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix}stop`)) {
        stop(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix}select`)) {
        // console.log("songResultsMap index 1 is: \n" + songResultMap[1]["title"] + "\n");
        // console.log("songResultsMap index 2 is: \n" + songResultMap[2]["title"] + "\n");
        // console.log("songResultsMap index 3 is: \n" + songResultMap[3]["title"] + "\n");

        if (songResultMap[0]) {
            // has selection
            select(message, serverQueue, songResultMap);
            return;
        } else {
            message.channel.send("Eh~ There's no playlist for me to select from. 🥺 Please use " + "`-p `" + " to search for a song! 😊");
            return;

        }
    } else if (message.content.startsWith(`${prefix}help`)) {
        message.channel.send("🔊 **DJ-Chan HELP SECTION:**\n");
        message.channel.send("> Use ` -p ` to search for a song.\n");
        message.channel.send("> Use ` -select ` to select a song from playlist.\n");
        message.channel.send("> Use ` -skip ` to skip to the next song in queue.\n");
        message.channel.send("> Use ` -stop ` to stop all songs and to disconnect DJ-Chan.\n-\n");
        message.channel.send("🤭🙏🏻 Ohayo~ Thank you for using ` DJ-Chan ` as your preferred music bot. I'm so happy to be at your service!");
        return;
    }
    else {
        message.channel.send("Eh? What are you typing...I don't understand! 👀");
    }
});

async function search(message, serverQueue) {
    let myString = message.content;
    let query = "";
    if (myString.charAt(2) == " ") {
        query = myString.substring(myString.indexOf(" ") + 1);
        console.log("Typed query is: " + query);
    } else {
        return message.channel.send("Please use `-p ` and search song name after the 'space'. (e.g. `-p songname` ) 👉👈");
    }

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel || !(message.member instanceof GuildMember))
        return message.channel.send(
            "Mmh... Please go to a voice channel to listen to your music! 🎵"
        );
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send(
            "I need the permissions to join and speak in your voice channel!"
        );
    }

    //newlines
    // const query = args[1];
    console.log("Searching Query is: " + query);
    let searchResult;
    try {
        searchResult = await discordPlayer.search(query, {
            requestedBy: message.author,
            searchEngine: QueryType.YOUTUBE_SEARCH,
        });
    } catch (err) {
        console.log("ERROR: " + err);
    };

    console.log("searchResult is: " + searchResult.playlist);
    // console.log("searchResult is: " + searchResult.tracks);

    if (!searchResult || !searchResult.tracks.length) {
        return message.channel.send('🙇‍♀️ Gomen nasai ごめんなさい, I cannot find the song with that name!');
    }


    if (searchResult.tracks.length == 1 || query.includes("https://")) {
        //play this song only
        const song = {
            title: searchResult.tracks[0].title,
            url: searchResult.tracks[0].url,
        };

        if (!serverQueue) {
            const queueContruct = {
                textChannel: message.channel,
                voiceChannel: voiceChannel,
                connection: null,
                audioPlayer: null,
                songs: [],
                volume: 5,
                playing: true
            };

            queue.set(message.guild.id, queueContruct);
            console.log("init set queue key id: " + message.guild.id);

            queueContruct.songs.push(song);
            console.log('URL is: ' + song.url);

            try {
                const connection = joinVoiceChannel(
                    {
                        channelId: voiceChannel.id,
                        guildId: message.guild.id,
                        adapterCreator: message.guild.voiceAdapterCreator,
                        selfDeaf: false,
                        selfMute: false,
                    });

                // var connection = await voiceChannel.join();
                console.log("Joined voice channel");
                queueContruct.connection = connection;
                console.log("DONE queueConstruct.connection");
                play(message.guild.id, queueContruct.songs[0]);
                console.log("After called play() function!");
            } catch (err) {
                console.log("FAILED | failed to join channel & play");
                console.log(err);
                queue.delete(message.guild.id);
                return message.channel.send(err);
            }
        } else {
            serverQueue.songs.push(song);
            return message.channel.send("😳 Chotto matte kudasai~ " + "` " + `${song.title}` + " `" + "has been added to the queue!" + " 👍");
            // }
        }
        return;
    }

    let compiledMessage = "";
    message.channel.send("**Loading... Please wait...**").then(msg => msg.delete({ timeout: "3000" }));
    console.log("\nconsoleLog: CHoose your song\n");


    function chooseSongOptions() {

        for (let i = 0; i < 5; i++) {
            const songTitle = searchResult.tracks[i].title;
            const songAuthor = searchResult.tracks[i].author;
            const songUrl = searchResult.tracks[i].url;

            const songDetails = {
                title: songTitle,
                author: songAuthor,
                url: songUrl,
            }
            songResultMap[i] = songDetails;

            const tempMessage = String("> " + "**`" + ` ${i} ` + "`** " + " 👉 " + ` ${songTitle} by ${songAuthor}\n` + "> - " + `${songUrl}\n`);
            console.log(tempMessage);

            compiledMessage = compiledMessage.concat(tempMessage);

            if (i == 4) {
                message.channel.send("👀 Searched for: " + "` " + `${query}` + " `" + "\n");
                message.channel.send("🎵 Top 5 results found for: " + "` " + `${query}` + " `" + "\n-\n");
                message.channel.send("**🥳 SENPAI... I FOUND THESE SONGS **" + "`" + " 0-4 " + "`" + " **FOR YOU.**" + " Type ` -select 0 ` to play the **first** song." + "\n\n");
                message.channel.send(compiledMessage);

            }
        }
    }

    chooseSongOptions();


}

async function select(message, serverQueue, songResultMap) {
    if (!message.member.voice.channel) {
        return message.channel.send(
            "Please join a voice channel before selecting a song. 😊🙏🏻");
    }

    let myString = message.content;
    const query = myString.substring(myString.indexOf(" ") + 1);
    console.log("Select index is: " + query);


    if (!isNaN(query)) {
        if (query <= 4) {
            const song = songResultMap[query];
            const voiceChannel = message.member.voice.channel;

            if (!serverQueue) {
                const queueContruct = {
                    textChannel: message.channel,
                    voiceChannel: voiceChannel,
                    connection: null,
                    audioPlayer: null,
                    songs: [],
                    volume: 5,
                    playing: true
                };
                queue.set(message.guild.id, queueContruct);
                console.log("init set queue key id: " + message.guild.id);

                queueContruct.songs.push(song);
                console.log('URL is: ' + song.url);

                try {
                    const connection = joinVoiceChannel(
                        {
                            channelId: voiceChannel.id,
                            guildId: message.guild.id,
                            adapterCreator: message.guild.voiceAdapterCreator,
                            selfDeaf: false,
                            selfMute: false,
                        });

                    // var connection = await voiceChannel.join();
                    console.log("Joined voice channel");
                    queueContruct.connection = connection;
                    console.log("DONE queueConstruct.connection");
                    play(message.guild.id, queueContruct.songs[0]);
                    console.log("After called play() function!");
                    songResultMap = {};

                } catch (err) {
                    console.log("FAILED | failed to join channel & play");
                    console.log(err);
                    queue.delete(message.guild.id);
                    songResultMap = {};
                    return message.channel.send(err);
                }

            } else {
                serverQueue.songs.push(song);
                return message.channel.send("😳 Chotto matte kudasai~ " + "` " + `${song.title}` + " `" + " has been added to the queue!" + " 👍");
            }
        } else {
            return message.channel.send(
                "Nani? 😵 Invalid number selected. Please select a song from ` 0-4 ` only.");
        }
    } else {
        return message.channel.send(
            "Nani? 😵 Invalid request. Please select a song from ` 0-4 ` only.");
    }




}

function skip(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send(
            "Woii! You have to be in a voice channel to stop the music!"
        );
    if (!serverQueue)
        return message.channel.send("Uhh... There is no song that I could skip!");

    serverQueue.audioPlayer.stop();
}

function stop(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send(
            "Woii! You have to be in a voice channel to stop the music!"
        );

    if (!serverQueue)
        return message.channel.send("There is no song that I could stop!");

    serverQueue.songs = [];
    serverQueue.audioPlayer.stop();

    // serverQueue.connection.dispatcher.end();
}

function play(messageGuildID, song) {
    console.log("RUN play() function! guild id is: " + messageGuildID);

    const serverQueue = queue.get(messageGuildID);

    const audioPlayer = createAudioPlayer();
    console.log("Created AudioPlayer: " + audioPlayer.state);

    serverQueue.audioPlayer = audioPlayer;

    if (!song) {
        console.log("No song! Leaving channel");
        serverQueue.textChannel.send("No song! Leaving channel");
        songResultMap = {};
        serverQueue.connection.disconnect();
        // serverQueue.voiceChannel.leave();
        queue.delete(messageGuildID);
        return;
    }

    const resource = createAudioResource(ytdl(song.url, { filter: 'audioonly', quality: 'highestaudio', highWaterMark: 1 << 25, }, { highWaterMark: 1 }));
    console.log("Created resource: " + resource.readable);
    // resource.volume.setVolume(0.5);
    audioPlayer.play(resource);
    serverQueue.connection.subscribe(audioPlayer);
    console.log("Connection subscribed to AudioPlayer!");
    audioPlayer.on(AudioPlayerStatus.Idle, () => {
        serverQueue.songs.shift();
        play(messageGuildID, serverQueue.songs[0]);
    });
    audioPlayer.on("error", error => console.error(error));

    // dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    console.log(`Start playing: ${song.title}\n` + song.url);
    audioPlayer.on(AudioPlayerStatus.Playing, () => {
        serverQueue.textChannel.send(`Start playing: **${song.title}**` + '\n' + song.url);
    });
}


client.login(token);

