import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CreateSupportTicketDto,
  AddTicketMessageDto,
  UpdateTicketStatusDto,
  SupportTicketResponseDto,
  TicketStatus,
  TicketPriority,
} from '../dto/support-ticket.dto.js';
import { SupplierAddonType } from '../../../generated/prisma/client/client.js';
import { SupplierAddonService } from './supplier-addon.service.js';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly addonService: SupplierAddonService,
  ) {}

  /**
   * Create support ticket
   */
  async createTicket(
    dto: CreateSupportTicketDto,
    supplierId: number,
  ): Promise<SupportTicketResponseDto> {
    this.logger.log(`Creating support ticket for supplier ${supplierId}`);

    // Check if supplier has Priority Support add-on
    const hasPrioritySupport = await this.addonService.hasAddon(
      supplierId,
      SupplierAddonType.PRIORITY_SUPPORT,
    );

    const ticket = await this.prisma.supplierSupportTicket.create({
      data: {
        supplierId,
        subject: dto.subject,
        description: dto.description,
        status: TicketStatus.OPEN,
        priority: dto.priority || TicketPriority.NORMAL,
        category: dto.category,
        isPriority: hasPrioritySupport,
      },
    });

    // Create initial message with description
    await this.prisma.supplierSupportMessage.create({
      data: {
        ticketId: ticket.id,
        message: dto.description,
      },
    });

    this.logger.log(
      `Support ticket ${ticket.id} created${hasPrioritySupport ? ' (PRIORITY)' : ''}`,
    );

    // Send notification to support team (would integrate with email/Slack)
    if (hasPrioritySupport) {
      this.logger.log(`🚨 PRIORITY TICKET ${ticket.id}: ${dto.subject}`);
    }

    return this.mapToResponseDto(ticket);
  }

  /**
   * Get supplier's support tickets
   */
  async getSupplierTickets(supplierId: number): Promise<SupportTicketResponseDto[]> {
    const tickets = await this.prisma.supplierSupportTicket.findMany({
      where: { supplierId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tickets.map((t) => this.mapToResponseDto(t));
  }

  /**
   * Get single ticket
   */
  async getTicket(
    ticketId: number,
    supplierId: number,
  ): Promise<SupportTicketResponseDto> {
    const ticket = await this.prisma.supplierSupportTicket.findUnique({
      where: { id: ticketId },
      include: {
        messages: {
          where: { isInternal: false }, // Hide internal notes from supplier
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.supplierId !== supplierId) {
      throw new ForbiddenException('You can only access your own tickets');
    }

    return this.mapToResponseDto(ticket);
  }

  /**
   * Add message to ticket
   */
  async addMessage(
    ticketId: number,
    dto: AddTicketMessageDto,
    supplierId: number,
    userId: number,
  ): Promise<SupportTicketResponseDto> {
    const ticket = await this.prisma.supplierSupportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.supplierId !== supplierId) {
      throw new ForbiddenException('You can only reply to your own tickets');
    }

    if (ticket.status === TicketStatus.CLOSED) {
      throw new ForbiddenException('Cannot add messages to closed tickets');
    }

    await this.prisma.supplierSupportMessage.create({
      data: {
        ticketId,
        userId,
        message: dto.message,
        attachments: dto.attachments || [],
        isInternal: false,
      },
    });

    // Update ticket status if resolved
    if (ticket.status === TicketStatus.RESOLVED) {
      await this.prisma.supplierSupportTicket.update({
        where: { id: ticketId },
        data: {
          status: TicketStatus.OPEN, // Reopen if supplier replies after resolution
        },
      });
    }

    this.logger.log(`Message added to ticket ${ticketId}`);

    return this.getTicket(ticketId, supplierId);
  }

  /**
   * Update ticket status (admin only - simplified for now)
   */
  async updateTicketStatus(
    ticketId: number,
    dto: UpdateTicketStatusDto,
  ): Promise<SupportTicketResponseDto> {
    const ticket = await this.prisma.supplierSupportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const updateData: any = {
      status: dto.status,
    };

    if (dto.status === TicketStatus.RESOLVED || dto.status === TicketStatus.CLOSED) {
      updateData.resolvedAt = new Date();
    }

    await this.prisma.supplierSupportTicket.update({
      where: { id: ticketId },
      data: updateData,
    });

    this.logger.log(`Ticket ${ticketId} status updated to ${dto.status}`);

    const updated = await this.prisma.supplierSupportTicket.findUnique({
      where: { id: ticketId },
      include: {
        messages: {
          where: { isInternal: false },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return this.mapToResponseDto(updated!);
  }

  /**
   * Get priority tickets (admin view)
   */
  async getPriorityTickets(): Promise<SupportTicketResponseDto[]> {
    const tickets = await this.prisma.supplierSupportTicket.findMany({
      where: {
        isPriority: true,
        status: {
          in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS],
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    return tickets.map((t) => this.mapToResponseDto(t));
  }

  /**
   * Get ticket statistics
   */
  async getTicketStats(supplierId: number) {
    const [total, open, inProgress, resolved, closed] = await Promise.all([
      this.prisma.supplierSupportTicket.count({
        where: { supplierId },
      }),
      this.prisma.supplierSupportTicket.count({
        where: { supplierId, status: TicketStatus.OPEN },
      }),
      this.prisma.supplierSupportTicket.count({
        where: { supplierId, status: TicketStatus.IN_PROGRESS },
      }),
      this.prisma.supplierSupportTicket.count({
        where: { supplierId, status: TicketStatus.RESOLVED },
      }),
      this.prisma.supplierSupportTicket.count({
        where: { supplierId, status: TicketStatus.CLOSED },
      }),
    ]);

    return {
      total,
      open,
      inProgress,
      resolved,
      closed,
    };
  }

  /**
   * Map to response DTO
   */
  private mapToResponseDto(ticket: any): SupportTicketResponseDto {
    return {
      id: ticket.id,
      supplierId: ticket.supplierId,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      isPriority: ticket.isPriority,
      assignedTo: ticket.assignedTo,
      resolvedAt: ticket.resolvedAt,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      messages: ticket.messages?.map((m: any) => ({
        id: m.id,
        userId: m.userId,
        message: m.message,
        isInternal: m.isInternal,
        attachments: m.attachments,
        createdAt: m.createdAt,
      })),
    };
  }
}
