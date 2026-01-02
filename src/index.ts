import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import prisma from './lib/db';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: true, // Reflect the request origin
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('GutiBaaz Server is running');
});

import { LudoGame } from './game/LudoGame';

const activeGames = new Map<string, LudoGame>();

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('joinGame', async ({ userId, betAmount, name, avatar }) => {
    // Simple matchmaking: find a waiting game or create new
    let game = Array.from(activeGames.values()).find(g => 
      g.state.status === 'waiting' && g.betAmount === betAmount && g.state.players.length < 2
    );

    if (!game) {
      // Create new game
      const gameSession = await prisma.gameSession.create({
        data: {
          betAmount,
          status: 'waiting'
        }
      });
      game = new LudoGame(gameSession.id, io, betAmount);
      activeGames.set(game.id, game);
    }

    const joined = await game.addPlayer(userId, socket.id, name, avatar);
    if (joined) {
      socket.join(game.id);
      socket.emit('gameJoined', { gameId: game.id, playerId: userId });
      
      // Add user to game session in DB
      await prisma.user.update({
        where: { id: userId },
        data: {
          gameSessions: {
            connect: { id: game.id }
          }
        }
      }).catch(e => console.error("Error linking user to game:", e));
    }
  });

  socket.on('rollDice', ({ gameId, playerId }) => {
    const game = activeGames.get(gameId);
    if (game) {
      game.rollDice(playerId);
    }
  });

  socket.on('movePiece', ({ gameId, playerId, pieceIndex }) => {
    const game = activeGames.get(gameId);
    if (game) {
      game.movePiece(playerId, pieceIndex);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Handle player disconnect (auto-resign or pause)
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
