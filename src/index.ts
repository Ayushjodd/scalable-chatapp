import { createClient } from "redis";
import { WebSocketServer, WebSocket } from "ws";
const wss = new WebSocketServer({ port: 8080 });

const publishClient = createClient();
publishClient.connect();

const subscribeClient = createClient();
subscribeClient.connect();

function randomId() {
  return Math.random();
}

function oneUserSubscribedTo(roomId: string) {
  let totalIntrestedPeople = 0;
  Object.keys(subscriptions).map((userId) => {
    if (subscriptions[userId].rooms.includes(roomId)) {
      totalIntrestedPeople++;
    }
  });
  if (totalIntrestedPeople == 1) {
    return true;
  }
  return false;
}

const subscriptions: {
  [key: string]: {
    ws: WebSocket;
    rooms: string[];
  };
} = {};

wss.on("connection", function connection(userSocket) {
  const id = randomId();
  subscriptions[id] = {
    ws: userSocket,
    rooms: [],
  };

  userSocket.on("message", function message(data) {
    const userMessage = JSON.parse(data as unknown as string);
    if (userMessage === "SUBSCRIBE") {
      subscriptions[id].rooms.push(userMessage.room);
      if (oneUserSubscribedTo(userMessage.room)) {
        subscribeClient.subscribe(userMessage.room, (message) => {
          const parsedMessage = JSON.parse(message);
          Object.keys(subscriptions).forEach((userId) => {
            const { ws, rooms } = subscriptions[userId];
            if (rooms.includes(parsedMessage.roomId)) {
              ws.send(parsedMessage.message);
            }
          });
        });
      }
    }

    if (userMessage.type === "UNSUBSCRIBE") {
      subscriptions[id].rooms = subscriptions[id].rooms.filter(
        (x) => x !== userMessage.room
      );
      if (lastPersonLeftRoom(userMessage.room)) {
        subscribeClient.unsubscribe(userMessage.room);
      }
    }

    if (userMessage.type === "sendMessage") {
      const message = userMessage.message;
      const roomId = userMessage.roomId;

      publishClient.publish(
        roomId,
        JSON.stringify({
          type: "sendMessage",
          roomId: roomId,
          message,
        })
      );
    }
  });
});

function lastPersonLeftRoom(roomId: string) {
  let totalIntrestedPeople = 0;
  Object.keys(subscriptions).map((userId) => {
    if (subscriptions[userId].rooms.includes(roomId)) {
      totalIntrestedPeople++;
    }
  });
  if (totalIntrestedPeople == 0) {
    return true;
  }
  return false;
}
