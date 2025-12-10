import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private connectedClients = new Map<number, Set<string>>(); // userId -> Set of socketIds

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async afterInit(server: Server) {
    const redisHost = this.configService.get<string>('REDIS_HOST');
    const redisPort = this.configService.get<number>('REDIS_PORT');
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD');

    // Only configure Redis adapter if Redis is available
    if (redisHost && redisPort) {
      try {
        const pubClient = createClient({
          socket: {
            host: redisHost,
            port: redisPort,
          },
          password: redisPassword || undefined,
        });

        const subClient = pubClient.duplicate();

        await Promise.all([pubClient.connect(), subClient.connect()]);

        server.adapter(createAdapter(pubClient, subClient));

        this.logger.log(
          '✅ Redis adapter configured for WebSocket horizontal scaling (Notifications)',
        );
      } catch (error) {
        this.logger.warn(
          `⚠️  Redis adapter initialization failed (Notifications): ${error.message}`,
        );
        this.logger.warn(
          'Falling back to in-memory adapter. Horizontal scaling will not work.',
        );
      }
    } else {
      this.logger.warn(
        '⚠️  Redis configuration not found. Using in-memory adapter. Horizontal scaling will not work.',
      );
    }
  }

  async handleConnection(client: Socket) {
    try {
      // Extract JWT token from handshake
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        this.logger.warn('Client connection rejected: No token provided');
        client.disconnect();
        return;
      }

      // Verify JWT token
      const secret = this.configService.get('JWT_SECRET');
      const payload = await this.jwtService.verifyAsync(token, { secret });

      if (!payload || !payload.sub) {
        this.logger.warn('Client connection rejected: Invalid token');
        client.disconnect();
        return;
      }

      const userId = payload.sub;

      // Store client connection
      if (!this.connectedClients.has(userId)) {
        this.connectedClients.set(userId, new Set());
      }
      const userSockets = this.connectedClients.get(userId);
      if (userSockets) {
        userSockets.add(client.id);
      }

      // Join user-specific room
      client.join(`user:${userId}`);

      // Store userId in socket data for later use
      client.data.userId = userId;

      this.logger.log(`Client connected: ${client.id} (User: ${userId})`);
      this.logger.debug(
        `Total connections for user ${userId}: ${userSockets?.size || 0}`,
      );
    } catch (error) {
      this.logger.error('Connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;

    if (userId && this.connectedClients.has(userId)) {
      const userSockets = this.connectedClients.get(userId);
      if (userSockets) {
        userSockets.delete(client.id);

        if (userSockets.size === 0) {
          this.connectedClients.delete(userId);
        }
      }

      this.logger.log(`Client disconnected: ${client.id} (User: ${userId})`);
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): string {
    return 'pong';
  }

  // ============================================
  // EMIT NOTIFICATION TO USER
  // ============================================

  sendNotificationToUser(userId: number, notification: any) {
    const room = `user:${userId}`;
    console.log('📡 [NotificationsGateway] Emitting notification to room:', room);
    console.log('📡 [NotificationsGateway] Notification data:', { id: notification.id, title: notification.title });

    this.server.to(room).emit('notification', notification);
    this.logger.debug(`Notification sent to user ${userId}:`, notification.title);

    console.log('📡 [NotificationsGateway] Notification emitted successfully');
  }

  // Send notification to multiple users
  sendNotificationToUsers(userIds: number[], notification: any) {
    userIds.forEach((userId) => {
      this.sendNotificationToUser(userId, notification);
    });
  }

  // Broadcast to all connected users
  broadcastNotification(notification: any) {
    this.server.emit('notification', notification);
    this.logger.debug('Notification broadcast to all users:', notification.title);
  }

  // Send unread count update
  sendUnreadCountUpdate(userId: number, count: number) {
    const room = `user:${userId}`;
    console.log('📊 [NotificationsGateway] Emitting unread count to room:', room, 'Count:', count);

    this.server.to(room).emit('unreadCount', { unreadCount: count });
    this.logger.debug(`Unread count update sent to user ${userId}: ${count}`);

    console.log('📊 [NotificationsGateway] Unread count emitted successfully');
  }

  // Check if user is connected
  isUserConnected(userId: number): boolean {
    const userSockets = this.connectedClients.get(userId);
    return this.connectedClients.has(userId) && (userSockets?.size || 0) > 0;
  }

  // Get connected users count
  getConnectedUsersCount(): number {
    return this.connectedClients.size;
  }

  // Get total connections count
  getTotalConnectionsCount(): number {
    let total = 0;
    this.connectedClients.forEach((sockets) => {
      total += sockets.size;
    });
    return total;
  }
}
