import { WebSocketServer, WebSocket } from "ws";
const wss = new WebSocketServer({ port: 8080 });

function randomId() {
  return Math.random();
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
    }

    if (userMessage.type === "UNSUBSCRIBE") {
      subscriptions[id].rooms = subscriptions[id].rooms.filter(
        (x) => x !== userMessage.room
      );
    }

    if (userMessage.type === "sendMessage") {
      const message = userMessage.message;
      const roomId = userMessage.roomId;
      Object.keys(subscriptions).forEach((userId) => {
        const { ws, rooms } = subscriptions[userId];
        if (rooms.includes(roomId)) {
          ws.send(message);
        }
      });
    }
  });
});
