require('dotenv').config();
const WebSocket = require('ws');
const axios = require('axios');

const url = "wss://gateway.discord.gg/?v=6&encoding=json";

//intialize websocket
const webS = new WebSocket(url);

console.log("LOHI");

const token = process.env.TOKEN;
const route = process.env.ROUTE;
const chatObj = JSON.parse(process.env.CHAT_OBJ);
let interval = 0;

const payload = {
  op: 2,
  d: {
    token,
    properties: {
      $os: 'linux',
      $browser: 'chrome',
      $device: 'chrome'
    }
  }
};

webS.on('open', () => {
  webS.send(JSON.stringify(payload));
});

webS.on('message', async (data) => {
  const { t, op, d } = JSON.parse(data);

  if (op === 10) {
    const { heartbeat_interval } = d;
    interval = heartbeat(heartbeat_interval);
  }

  if (t === 'MESSAGE_CREATE') {
    const { author: { username: author }, content, channel_id, attachments } = d;

    if (!chatObj[channel_id]) return;

    // Remove any part of content that starts with < and ends with >
    const sanitizedContent = content.replace(/<[^>]*>/g, '');

    // Send the message data to the specified route
    try {
      await axios.post(`${route}/sendToGroup`, {
        channel: chatObj[channel_id],
        author,
        content: sanitizedContent,
        attachments: attachments || []
      });
      console.log(`Message sent to tg-group: [${chatObj[channel_id]}] - ${author} : ${sanitizedContent}`);
    } catch (error) {
      console.error('Error sending message to /sendToGroup:', error.message);
    }
  }
});

webS.on('close', () => {
  clearInterval(interval);
  console.log("WebSocket connection closed, attempting to reconnect...");
  reconnectWebSocket();
});

webS.on('error', (error) => {
  console.error('WebSocket error:', error.message);
});

const heartbeat = (ms) => setInterval(() => {
  webS.send(JSON.stringify({ op: 1, d: null }));
}, ms);

function reconnectWebSocket() {
  setTimeout(() => {
    webS = new WebSocket(url);
    webS.on('open', () => {
      webS.send(JSON.stringify(payload));
    });
  }, 5000);
}
