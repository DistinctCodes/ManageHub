import { 
    WebSocketGateway, 
    WebSocketServer, 
    OnGatewayConnection, 
    OnGatewayDisconnect 
  } from '@nestjs/websockets';
  import { Server, Socket } from 'socket.io';
  import { Notification } from './entities/notification.entity';
  
  @WebSocketGateway({
    cors: {
      origin: '*', // Set appropriate CORS settings for production
    },
  })
  export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;
  
    // Store connected clients and their associated user IDs
    private connectedClients: Map<string, string[]> = new Map();
  
    handleConnection(client: Socket) {
      const userId = client.handshake.query.userId as string;
      if (userId) {
        // Associate this socket with the user ID
        const existingSockets = this.connectedClients.get(userId) || [];
        this.connectedClients.set(userId, [...existingSockets, client.id]);
      }
    }
  
    handleDisconnect(client: Socket) {
      // Remove the disconnected socket from our tracking
      for (const [userId, sockets] of this.connectedClients.entries()) {
        const filteredSockets = sockets.filter(socketId => socketId !== client.id);
        if (filteredSockets.length === 0) {
          this.connectedClients.delete(userId);
        } else {
          this.connectedClients.set(userId, filteredSockets);
        }
      }
    }
  
    sendNotification(userId: string, notification: Notification) {
      const userSockets = this.connectedClients.get(userId);
      if (userSockets && userSockets.length > 0) {
        // Send to all connected devices of this user
        for (const socketId of userSockets) {
          this.server.to(socketId).emit('notification', notification);
        }
      }
    }
  }
  