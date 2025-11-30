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
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/messaging',
})
export class MessagingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagingGateway.name);
  private connectedUsers = new Map<number, Set<string>>(); // userId -> Set of socketIds

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
          '✅ Redis adapter configured for WebSocket horizontal scaling (Messaging)',
        );
      } catch (error) {
        this.logger.warn(
          `⚠️  Redis adapter initialization failed (Messaging): ${error.message}`,
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
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      const userSockets = this.connectedUsers.get(userId);
      if (userSockets) {
        userSockets.add(client.id);
      }

      // Join user-specific room
      client.join(`user:${userId}`);

      // Store userId in socket data
      client.data.userId = userId;

      this.logger.log(`Client connected: ${client.id} (User: ${userId})`);
    } catch (error) {
      this.logger.error('Connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;

    if (userId && this.connectedUsers.has(userId)) {
      const userSockets = this.connectedUsers.get(userId);
      if (userSockets) {
        userSockets.delete(client.id);

        if (userSockets.size === 0) {
          this.connectedUsers.delete(userId);
        }
      }

      this.logger.log(`Client disconnected: ${client.id} (User: ${userId})`);
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): string {
    return 'pong';
  }

  @SubscribeMessage('join-conversation')
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() conversationId: number,
  ) {
    client.join(`conversation:${conversationId}`);
    this.logger.debug(
      `User ${client.data.userId} joined conversation ${conversationId}`,
    );
    return { success: true, conversationId };
  }

  @SubscribeMessage('leave-conversation')
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() conversationId: number,
  ) {
    client.leave(`conversation:${conversationId}`);
    this.logger.debug(
      `User ${client.data.userId} left conversation ${conversationId}`,
    );
    return { success: true, conversationId };
  }

  @SubscribeMessage('typing-start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number },
  ) {
    const userId = client.data.userId;
    // Broadcast to others in the conversation room
    client
      .to(`conversation:${data.conversationId}`)
      .emit('user-typing', { userId, conversationId: data.conversationId });
  }

  @SubscribeMessage('typing-stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number },
  ) {
    const userId = client.data.userId;
    // Broadcast to others in the conversation room
    client
      .to(`conversation:${data.conversationId}`)
      .emit('user-stopped-typing', {
        userId,
        conversationId: data.conversationId,
      });
  }

  // ============================================
  // EMIT EVENTS TO CLIENTS
  // ============================================

  // Send new message to all participants in a conversation
  sendMessageToConversation(conversationId: number, message: any) {
    this.server
      .to(`conversation:${conversationId}`)
      .emit('new-message', message);
    this.logger.debug(
      `Message sent to conversation ${conversationId}:`,
      message.id,
    );
  }

  // Send message directly to a specific user (e.g., for new conversation notification)
  sendMessageToUser(userId: number, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
    this.logger.debug(`Event ${event} sent to user ${userId}`);
  }

  // Notify user about unread count update
  sendUnreadCountUpdate(userId: number, count: number) {
    this.server
      .to(`user:${userId}`)
      .emit('unread-count-update', { totalUnread: count });
    this.logger.debug(`Unread count update sent to user ${userId}: ${count}`);
  }

  // Check if user is online
  isUserOnline(userId: number): boolean {
    const userSockets = this.connectedUsers.get(userId);
    return this.connectedUsers.has(userId) && (userSockets?.size || 0) > 0;
  }

  // Get online users count
  getOnlineUsersCount(): number {
    return this.connectedUsers.size;
  }
}
