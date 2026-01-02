import { Server, Socket } from 'socket.io';
import prisma from '../lib/db';

interface Player {
  id: string;
  color: 'red' | 'green' | 'blue' | 'yellow';
  pieces: number[]; // Positions of 4 pieces (0-51 main path, 52-57 home path, -1 base, 100 home)
  socketId?: string;
  isBot: boolean;
  name: string;
  avatar?: string;
}

interface GameState {
  players: Player[];
  currentTurn: number; // Index of the player
  diceValue: number | null;
  canRoll: boolean;
  winners: string[];
  status: 'waiting' | 'playing' | 'completed';
}

export class LudoGame {
  id: string;
  io: Server;
  state: GameState;
  betAmount: number;

  constructor(id: string, io: Server, betAmount: number) {
    this.id = id;
    this.io = io;
    this.betAmount = betAmount;
    this.state = {
      players: [],
      currentTurn: 0,
      diceValue: null,
      canRoll: false,
      winners: [],
      status: 'waiting',
    };
  }

  async addPlayer(userId: string, socketId: string, name: string, avatar?: string) {
    if (this.state.players.length >= 2) return false;

    const colors: Player['color'][] = ['red', 'green']; // 2 player game for now
    const color = colors[this.state.players.length];

    this.state.players.push({
      id: userId,
      color,
      pieces: [-1, -1, -1, -1], // All in base
      socketId,
      isBot: false,
      name,
      avatar,
    });

    if (this.state.players.length === 2) {
      this.startGame();
    }

    return true;
  }

  startGame() {
    this.state.status = 'playing';
    this.state.currentTurn = 0;
    this.state.canRoll = true;
    this.emitState();
  }

  rollDice(playerId: string) {
    const playerIndex = this.state.players.findIndex(p => p.id === playerId);
    if (playerIndex !== this.state.currentTurn || !this.state.canRoll) return;

    this.state.diceValue = Math.floor(Math.random() * 6) + 1;
    this.state.canRoll = false;
    
    // Check if any moves are possible
    if (!this.hasValidMoves(playerIndex, this.state.diceValue)) {
      setTimeout(() => this.nextTurn(), 1000);
    }

    this.emitState();
  }

  movePiece(playerId: string, pieceIndex: number) {
    const playerIndex = this.state.players.findIndex(p => p.id === playerId);
    if (playerIndex !== this.state.currentTurn || this.state.canRoll || !this.state.diceValue) return;

    const player = this.state.players[playerIndex];
    const currentPos = player.pieces[pieceIndex];
    const dice = this.state.diceValue;

    if (!this.isValidMove(currentPos, dice)) return;

    // Move logic
    if (currentPos === -1) {
      if (dice === 6) player.pieces[pieceIndex] = 0; // Start position
    } else {
      player.pieces[pieceIndex] += dice;
    }

    // Check win condition for piece (simplified for now)
    if (player.pieces[pieceIndex] >= 57) {
       player.pieces[pieceIndex] = 100; // Home
    }

    // Check collisions (simplified)
    // TODO: Implement full collision logic

    // Check game win
    if (player.pieces.every(p => p === 100)) {
      this.state.winners.push(playerId);
      this.endGame();
      return;
    }

    if (dice !== 6) {
      this.nextTurn();
    } else {
      this.state.canRoll = true;
      this.state.diceValue = null;
      this.emitState();
    }
  }

  nextTurn() {
    this.state.currentTurn = (this.state.currentTurn + 1) % this.state.players.length;
    this.state.canRoll = true;
    this.state.diceValue = null;
    this.emitState();
  }

  hasValidMoves(playerIndex: number, dice: number): boolean {
    const player = this.state.players[playerIndex];
    return player.pieces.some(pos => this.isValidMove(pos, dice));
  }

  isValidMove(pos: number, dice: number): boolean {
    if (pos === 100) return false; // Already home
    if (pos === -1) return dice === 6; // Need 6 to start
    if (pos + dice > 57) return false; // Overshoot home
    return true;
  }

  emitState() {
    this.io.to(this.id).emit('gameState', this.state);
  }

  async endGame() {
    this.state.status = 'completed';
    this.emitState();
    
    // Update DB
    await prisma.gameSession.update({
      where: { id: this.id },
      data: { 
        status: 'completed',
        winnerId: this.state.winners[0]
      }
    });
  }
}
