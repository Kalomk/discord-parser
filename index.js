require('dotenv').config();
const WebSocket = require('ws');
const axios = require('axios');

const url = "wss://gateway.discord.gg/?v=6&encoding=json";
const webS = new WebSocket(url);

console.log("LOHI");

const token = process.env.TOKEN ;

let interval = 0;

const chatObj = JSON.parse(process.env.CHAT_OBJ);

const catchMessagesFromDiscord = (token) => {
  const payload = {
    op: 2,
    d: {
      token,
      properties: {
        $os: 'linux',
        $browser: 'chrome',
        $devise: 'chrome'
      }
    }
  };

  webS.on('open', () => {
    webS.send(JSON.stringify(payload));
  });

  webS.on('message', async (data) => {
    let payload = JSON.parse(data);
    const { t, op, d } = payload;

    switch (op) {
      case 10:
        const { heartbeat_interval } = d;
        interval = heartbeat(heartbeat_interval);
        break;
    }

    switch (t) {
      case 'MESSAGE_CREATE':
        let author = d.author.username;
        let content = d.content;
        let channel_id = d.channel_id;

        if (chatObj[channel_id] === undefined) {
          return;
        }

        // Remove any part of content that starts with < and ends with >
        content = content.replace(/<[^>]*>/g, '');

        // Send the message data to the specified route
        try {
          await axios.post(`${process.env.ROUTE}/sendToGroup`, {
            channel: chatObj[channel_id],
            author,
            content
          });
          console.log(`Message sent to tg-group: [${chatObj[channel_id]}] - ${author} : ${content}`);
        } catch (error) {
          console.error('Error sending message to /sendToGroup:', error.message);
        }
        break;
    }
  });

  const heartbeat = (ms) => {
    return setInterval(() => {
      webS.send(JSON.stringify({ op: 1, d: null }));
    }, ms);
  };
};

catchMessagesFromDiscord(token);
