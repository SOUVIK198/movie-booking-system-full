const PDFDocument = require('pdfkit');

/**
 * Builds a movie ticket PDF in memory and resolves with a Buffer.
 * Keeping it in-memory (no disk write) keeps this stateless/container-friendly.
 */
const generateTicketPDF = (booking) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A5', margin: 40 });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const { movie, theatre, show, seats, ticketCode, totalAmount, user } = booking;

      doc.fontSize(20).fillColor('#e50914').text('MovieBooking Ticket', { align: 'center' });
      doc.moveDown();
      doc.fontSize(14).fillColor('#000').text(movie.title, { align: 'center', underline: true });
      doc.moveDown();

      doc.fontSize(11);
      doc.text(`Booking Code: ${ticketCode}`);
      doc.text(`Booked By: ${user.name} (${user.email})`);
      doc.text(`Theatre: ${theatre.name}, ${theatre.address?.city || ''}`);
      doc.text(`Show Date: ${new Date(show.showDate).toDateString()}`);
      doc.text(`Show Time: ${show.startTime}`);
      doc.text(`Format/Language: ${show.format} / ${show.language}`);
      doc.text(`Seats: ${seats.map((s) => s.label).join(', ')}`);
      doc.text(`Total Paid: $${totalAmount.toFixed(2)}`);
      doc.moveDown();
      doc.fontSize(9).fillColor('#666').text('Please arrive at least 20 minutes before showtime. This ticket is non-transferable.', {
        align: 'center',
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = generateTicketPDF;