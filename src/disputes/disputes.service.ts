import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { DisputeStatus, DisputeType } from '../../generated/prisma/client/enums.js';
import { CreateDisputeDto } from './dto/create-dispute.dto.js';
import { UpdateDisputeStatusDto } from './dto/update-dispute-status.dto.js';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto.js';
import { FilterDisputeDto } from './dto/filter-dispute.dto.js';

@Injectable()
export class DisputesService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(userId: number, createDisputeDto: CreateDisputeDto) {
    const { bookingId, type, description } = createDisputeDto;

    // Check if booking exists and user is part of it
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        supplier: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== userId && booking.supplier.userId !== userId) {
      throw new ForbiddenException('You are not authorized to create a dispute for this booking');
    }

    // Determine initiator and respondent
    const isGuest = booking.userId === userId;
    const initiatorId = userId;
    const respondentId = isGuest ? booking.supplier.userId : booking.userId;

    // Check if there's already an open dispute for this booking
    const existingDispute = await this.prisma.dispute.findFirst({
      where: {
        bookingId,
        status: {
          in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW],
        },
      },
    });

    if (existingDispute) {
      throw new BadRequestException('There is already an open dispute for this booking');
    }

    // Create the dispute
    const dispute = await this.prisma.dispute.create({
      data: {
        bookingId,
        initiatorId,
        respondentId,
        type,
        title: `Dispute: ${type}`,
        description,
        status: DisputeStatus.OPEN,
      },
      include: {
        initiator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        respondent: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        booking: {
          include: {
            supplier: true,
          },
        },
      },
    });

    // Notify the respondent
    await this.notificationsService.create({
      userId: respondentId,
      type: 'BOOKING_UPDATE',
      title: 'New Dispute Created',
      message: `A dispute has been opened for booking #${bookingId}`,
    });

    // Notify admins
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
    });

    for (const admin of admins) {
      await this.notificationsService.create({
        userId: admin.id,
        type: 'BOOKING_UPDATE',
        title: 'New Dispute Requires Review',
        message: `Dispute #${dispute.id} has been created for booking #${bookingId}`,
      });
    }

    return dispute;
  }

  async findAll(filters: FilterDisputeDto) {
    const { status, type, adminId, search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (adminId) {
      where.assignedAdminId = adminId;
    }

    if (search) {
      where.OR = [
        {
          description: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          resolution: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [disputes, total] = await Promise.all([
      this.prisma.dispute.findMany({
        where,
        include: {
          initiator: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          respondent: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          booking: {
            include: {
              supplier: true,
            },
          },
          assignedAdmin: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.dispute.count({ where }),
    ]);

    return {
      disputes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findMyDisputes(userId: number) {
    const disputes = await this.prisma.dispute.findMany({
      where: {
        OR: [
          { initiatorId: userId },
          { respondentId: userId },
        ],
      },
      include: {
        initiator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        respondent: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        booking: {
          include: {
            supplier: true,
          },
        },
        assignedAdmin: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return disputes;
  }

  async findOne(id: number, userId?: number, userRole?: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
      include: {
        initiator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        respondent: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        booking: {
          include: {
            supplier: true,
          },
        },
        assignedAdmin: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Check authorization for non-admin users
    if (userRole !== 'ADMIN' && userId) {
      const isAuthorized =
        dispute.initiatorId === userId ||
        dispute.respondentId === userId;

      if (!isAuthorized) {
        throw new ForbiddenException('You are not authorized to view this dispute');
      }
    }

    return dispute;
  }

  async assignToAdmin(disputeId: number, adminId: number) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    const updatedDispute = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        assignedAdminId: adminId,
        status: DisputeStatus.UNDER_REVIEW,
      },
      include: {
        initiator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        respondent: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        booking: {
          include: {
            supplier: true,
          },
        },
        assignedAdmin: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Notify the dispute initiator
    await this.notificationsService.create({
      userId: dispute.initiatorId,
      type: 'BOOKING_UPDATE',
      title: 'Dispute Under Review',
      message: `Your dispute #${disputeId} is now being reviewed by our team`,
    });

    return updatedDispute;
  }

  async updateStatus(disputeId: number, updateDisputeStatusDto: UpdateDisputeStatusDto) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    const updatedDispute = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: updateDisputeStatusDto.status,
      },
      include: {
        initiator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        respondent: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        booking: {
          include: {
            supplier: true,
          },
        },
        assignedAdmin: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Notify the dispute initiator
    await this.notificationsService.create({
      userId: dispute.initiatorId,
      type: 'BOOKING_UPDATE',
      title: 'Dispute Status Updated',
      message: `Your dispute #${disputeId} status has been updated to ${updateDisputeStatusDto.status}`,
    });

    return updatedDispute;
  }

  async resolve(disputeId: number, resolveDisputeDto: ResolveDisputeDto, adminId: number) {
    const { resolution, refundAmount } = resolveDisputeDto;

    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        booking: {
          include: {
            supplier: true,
          },
        },
      },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    const updatedDispute = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: DisputeStatus.RESOLVED,
        resolution,
        refundAmount,
        resolvedAt: new Date(),
      },
      include: {
        initiator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        respondent: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        booking: {
          include: {
            supplier: true,
          },
        },
        assignedAdmin: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Notify both parties
    const notificationMessage = refundAmount
      ? `Your dispute #${disputeId} has been resolved with a refund of €${refundAmount}`
      : `Your dispute #${disputeId} has been resolved`;

    await this.notificationsService.create({
      userId: dispute.initiatorId,
      type: 'BOOKING_UPDATE',
      title: 'Dispute Resolved',
      message: notificationMessage,
    });

    await this.notificationsService.create({
      userId: dispute.respondentId,
      type: 'BOOKING_UPDATE',
      title: 'Dispute Resolved',
      message: `Dispute #${disputeId} for booking #${dispute.bookingId} has been resolved`,
    });

    return updatedDispute;
  }

  async addNote(disputeId: number, note: string, adminId: number) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Since there's no DisputeNote model, we'll just return success
    // In a real implementation, you might want to add a notes JSON field to the Dispute model
    return { message: 'Note functionality not yet implemented in schema' };
  }

  async getStats() {
    const [total, open, underReview, resolved, closed] = await Promise.all([
      this.prisma.dispute.count(),
      this.prisma.dispute.count({ where: { status: DisputeStatus.OPEN } }),
      this.prisma.dispute.count({ where: { status: DisputeStatus.UNDER_REVIEW } }),
      this.prisma.dispute.count({ where: { status: DisputeStatus.RESOLVED } }),
      this.prisma.dispute.count({ where: { status: DisputeStatus.CLOSED } }),
    ]);

    return {
      total,
      open,
      underReview,
      resolved,
      closed,
    };
  }
}
