const { GuildMember, VoiceChannel, Speaking } = require("discord.js");
const Client = require('./client');
const { Player } = require('discord-player');
const { QueryType } = require('discord-player');
const { prefix, token } = require("./config");

const ytdl = require("ytdl-core");
const { options } = require("./play");

// const client = new Discord.Client();
const client = new Client();
const player = new Player(client);

const queue = new Map();

client.once("ready", () => {
    console.log("Ready!");
});

client.once("reconnecting", () => {
    console.log("Reconnecting!");
});

client.once("disconnect", () => {
    console.log("Disconnect!");
});

client.on("message", async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;

    const serverQueue = queue.get(message.guild.id);

    if (message.content.startsWith(`${prefix}p`)) {
        execute(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix}skip`)) {
        skip(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix}stop`)) {
        stop(message, serverQueue);
        return;
    } else {
        message.channel.send("What are you typing...I don't understand!");
    }
});

async function execute(message, serverQueue) {
    const args = message.content.split(" ");

    // const voiceChannel = message.member.voice.channel;
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel || !(message.member instanceof GuildMember))
        return message.channel.send(
            "Go to MAMAK (Husen) to listen to your music!"
        );
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send(
            "I need the permissions to join and speak in your voice channel!"
        );
    }

    //newlines
    const query = args[1];
    const searchResult = await player.search(query, {
        requestedBy: message.user,
        searchEngine: QueryType.YOUTUBE_SEARCH,
    }).catch(() => { });

    if (!searchResult || !searchResult.tracks.length) {
        return message.channel.send('Aiya, I cannot find the song with that name!');
    }


    // const queuePlayer = player.createQueue(message.guild);
    // await queuePlayer.connect(voiceChannel);
    // try {
    //     if (!queuePlayer.connection) await queuePlayer.connect(voiceChannel);
    // } catch (err) {
    //     void player.deleteQueue(message.id);
    //     return message.channel.send('Could not join your voice channel! err: ' + String(err));
    // }
    // await message.channel.send(
    //     `⏱ | Loading your ${searchResult.playlist ? 'playlist' : 'track'}...`);

    // searchResult.playlist ? queuePlayer.addTracks(searchResult.tracks) : queuePlayer.addTrack(searchResult.tracks[0]);
    // if (!queuePlayer.playing) await queuePlayer.play();

    // queuePlayer.current.url
    //End of new line

    // const songInfo = await ytdl.getInfo(args[1]);
    // const song = {
    //     title: songInfo.videoDetails.title,
    //     url: songInfo.videoDetails.video_url,
    // };
    const song = {
        title: searchResult.playlist ? searchResult.tracks[0].title : searchResult.tracks[0].title,
        url: searchResult.playlist ? searchResult.tracks[0].url : searchResult.tracks[0].url,
    };

    if (!serverQueue) {
        const queueContruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            playing: true
        };

        queue.set(message.guild.id, queueContruct);
        console.log("init set queue key id: " + message.guild.id);

        queueContruct.songs.push(song);
        console.log('URL is: ' + song.url);

        try {
            var connection = await voiceChannel.join();
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
        return message.channel.send(`Why so demanding... Here, ${song.title} has been added to the queue!`);
        // }
    }
}

function skip(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send(
            "Woii! You have to be in a voice channel to stop the music!"
        );
    if (!serverQueue)
        return message.channel.send("Uhh... There is no song that I could skip!");
    serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send(
            "Woii! You have to be in a voice channel to stop the music!"
        );

    if (!serverQueue)
        return message.channel.send("There is no song that I could stop!");

    // serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();

}

function play(messageGuildID, song) {
    console.log("RUN play() function! guild id is: " + messageGuildID);

    const serverQueue = queue.get(messageGuildID);
    if (!song) {
        console.log("No song! Leaving channel");

        serverQueue.voiceChannel.leave();
        queue.delete(messageGuildID);
        return;
    }

    const dispatcher = serverQueue.connection
        .play(ytdl(song.url, { filter: 'audioonly', quality: 'highestaudio', highWaterMark: 1 << 24, }, { highWaterMark: 1 }))
        .on("finish", () => {
            serverQueue.songs.shift();
            play(messageGuildID, serverQueue.songs[0]);
        })
        .on("error", error => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    console.log(`Start playing: ${song.title}\n` + song.url);

    serverQueue.textChannel.send(`Start playing: **${song.title}**` + '\n' + song.url);
}


client.login(token);

