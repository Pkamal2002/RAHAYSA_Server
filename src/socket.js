import { Server } from 'socket.io';

let io;

export const initSocket = (server) => {
  const allowedOrigins = [
    process.env.CLIENT_URL,
    'https://rahasya-client.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ].filter(origin => origin);

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const sanitizedOrigin = origin.replace(/\/$/, "");
        const isAllowed = allowedOrigins.some(ao => ao.replace(/\/$/, "") === sanitizedOrigin);
        if (isAllowed) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ['GET', 'POST'],
      credentials: true
    }
  });
  
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    socket.on('join', (userId) => {
      socket.join(userId);
      console.log(`User ${userId} joined their personal room`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};
