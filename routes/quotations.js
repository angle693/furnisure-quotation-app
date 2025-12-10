const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const Quotation = require('../models/Quotation');

// ✅ MUST HAVE THIS
router.post('/', async (req, res) => {
  try {
    const { clientName, clientAddress, clientContact, items } = req.body;
    if (!clientName || !clientAddress || !clientContact || !items?.length) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const subtotal = items.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);
    const netAmount = subtotal;
    const grandTotal = netAmount;
    const remaining = grandTotal;

    const last = await Quotation.findOne().sort({ createdAt: -1 });
    const num = last ? parseInt(last.quotationNo.split('-')[1]) + 1 : 1001;
    const quotationNo = `Q-${num}`;

    // Save to DB
    const quote = new Quotation({
      quotationNo, clientName, clientAddress, clientContact,
      items, subtotal, netAmount, grandTotal, remainingAmount: remaining
    });
    await quote.save();

    // Generate PDF
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];
    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => {
      const pdf = Buffer.concat(buffers);
      res.writeHead(200, { 'Content-Type': 'application/pdf' });
      res.end(pdf);
    });

    // Business Info
    doc.fontSize(10).text('618,Shreeji park society,Hightention line road,Subhanpura,Vadodara-390021 Mo.9737888669', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text('INVOICE', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10);
    doc.text(`CLIENT NAME: ${clientName}`);
    doc.text(`ADDRESS: ${clientAddress}`);
    doc.text(`CONTACT NUMBER: ${clientContact}`);
    doc.text(`DATE: ${new Date().toLocaleDateString('en-GB')}`);
    doc.moveDown();

    // Items
    doc.font('Helvetica-Bold');
    doc.text('SL', 50, doc.y, { width: 30 });
    doc.text('Description', 85, doc.y, { width: 365 });
    doc.text('Amount', 460, doc.y, { width: 90, align: 'right' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    doc.font('Helvetica');
    items.forEach((item, i) => {
      doc.text(i + 1, 50, doc.y, { width: 30 });
      doc.text(item.description, 85, doc.y, { width: 365 });
      doc.text(parseFloat(item.amount).toLocaleString('en-IN'), 460, doc.y, { width: 90, align: 'right' });
      doc.moveDown();
    });
    doc.moveDown();

    // Financial Line
    doc.fontSize(10).text(
      `SUB TOTAL ${subtotal.toLocaleString('en-IN')} ` +
      `Net Amount ${netAmount.toLocaleString('en-IN')} ` +
      `GRAND TOTAL ${grandTotal.toLocaleString('en-IN')} ` +
      `Remaining Amount ${remaining.toLocaleString('en-IN')}`,
      50, doc.y, { width: 500 }
    );
    doc.moveDown(2);
    doc.text('For, FURNiSURE', 400, doc.y);
    doc.moveDown();
    doc.text('Partners', 400, doc.y);
    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'PDF failed' });
  }
});

// Other routes
router.get('/', async (req, res) => { /* ... */ });
// ... (PUT, DELETE, etc.)

module.exports = router;