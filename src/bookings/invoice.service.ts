import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

@Injectable()
export class InvoiceService {
  async generateInvoice(booking: any): Promise<Readable> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const stream = new Readable({
          read() {},
        });

        // Pipe PDF data to the stream
        doc.on('data', (chunk) => stream.push(chunk));
        doc.on('end', () => {
          stream.push(null);
          resolve(stream);
        });
        doc.on('error', reject);

        // Header
        doc
          .fontSize(20)
          .font('Helvetica-Bold')
          .text('INVOICE', 50, 50);

        doc
          .fontSize(10)
          .font('Helvetica')
          .text(`Invoice #: ${booking.bookingReference}`, 50, 80)
          .text(`Date: ${new Date(booking.createdAt).toLocaleDateString()}`, 50, 95)
          .text(`Service Date: ${new Date(booking.serviceDate).toLocaleDateString()}`, 50, 110);

        // Supplier Info
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('From:', 50, 150);

        doc
          .fontSize(10)
          .font('Helvetica')
          .text(booking.supplier.businessName, 50, 170)
          .text(booking.supplier.user.email, 50, 185);

        if (booking.supplier.user.phone) {
          doc.text(booking.supplier.user.phone, 50, 200);
        }

        // Customer Info
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('Bill To:', 350, 150);

        doc
          .fontSize(10)
          .font('Helvetica')
          .text(
            `${booking.user.firstName} ${booking.user.lastName}`,
            350,
            170,
          )
          .text(booking.user.email, 350, 185);

        if (booking.user.phone) {
          doc.text(booking.user.phone, 350, 200);
        }

        // Table Header
        const tableTop = 260;
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('Service', 50, tableTop)
          .text('Type', 250, tableTop)
          .text('Qty', 360, tableTop, { width: 50, align: 'right' })
          .text('Price', 420, tableTop, { width: 60, align: 'right' })
          .text('Total', 490, tableTop, { width: 60, align: 'right' });

        // Draw line under header
        doc
          .moveTo(50, tableTop + 15)
          .lineTo(550, tableTop + 15)
          .stroke();

        // Table Items
        let yPosition = tableTop + 30;
        doc.font('Helvetica');

        for (const item of booking.bookingItems) {
          doc
            .fontSize(9)
            .text(item.service.name, 50, yPosition, { width: 190 })
            .text(item.service.type, 250, yPosition)
            .text(item.quantity.toString(), 360, yPosition, {
              width: 50,
              align: 'right',
            })
            .text(
              `${booking.currency} ${Number(item.unitPrice).toFixed(2)}`,
              420,
              yPosition,
              { width: 60, align: 'right' },
            )
            .text(
              `${booking.currency} ${Number(item.totalPrice).toFixed(2)}`,
              490,
              yPosition,
              { width: 60, align: 'right' },
            );

          yPosition += 25;
        }

        // Draw line before totals
        doc
          .moveTo(50, yPosition + 10)
          .lineTo(550, yPosition + 10)
          .stroke();

        // Totals
        yPosition += 30;
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('Subtotal:', 400, yPosition)
          .text(
            `${booking.currency} ${Number(booking.totalAmount).toFixed(2)}`,
            490,
            yPosition,
            { width: 60, align: 'right' },
          );

        yPosition += 20;
        doc
          .fontSize(12)
          .text('Total:', 400, yPosition)
          .text(
            `${booking.currency} ${Number(booking.totalAmount).toFixed(2)}`,
            490,
            yPosition,
            { width: 60, align: 'right' },
          );

        // Payment Status
        yPosition += 40;
        doc.fontSize(10).font('Helvetica');

        const paymentStatus = booking.payments?.find(
          (p: any) => p.status === 'COMPLETED',
        )
          ? 'PAID'
          : 'PENDING';

        doc
          .text('Payment Status:', 50, yPosition)
          .font('Helvetica-Bold')
          .fillColor(paymentStatus === 'PAID' ? 'green' : 'red')
          .text(paymentStatus, 150, yPosition)
          .fillColor('black');

        // Booking Status
        yPosition += 20;
        doc
          .font('Helvetica')
          .text('Booking Status:', 50, yPosition)
          .font('Helvetica-Bold')
          .text(booking.status, 150, yPosition);

        // Notes
        if (booking.notes) {
          yPosition += 40;
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('Notes:', 50, yPosition);

          yPosition += 20;
          doc
            .font('Helvetica')
            .fontSize(9)
            .text(booking.notes, 50, yPosition, { width: 500 });
        }

        // Footer
        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor('gray')
          .text(
            'Thank you for your business!',
            50,
            doc.page.height - 100,
            { align: 'center', width: doc.page.width - 100 },
          )
          .text(
            `Generated on ${new Date().toLocaleString()}`,
            50,
            doc.page.height - 80,
            { align: 'center', width: doc.page.width - 100 },
          );

        // Finalize PDF
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}