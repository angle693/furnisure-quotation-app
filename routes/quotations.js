const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const Quotation = require('../models/Quotation');

// GET /api/quotations/:id
router.get('/:id', async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) return res.status(404).json({ error: 'Not found' });
    res.json(quotation);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

// PUT /api/quotations/:id
router.put('/:id', async (req, res) => {
  try {
    const { clientName, clientAddress, clientContact, items, discount = 0, advance = 0 } = req.body;
    if (!clientName || !clientAddress || !clientContact || !items?.length) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const subtotal = items.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);
    const netAmount = subtotal - parseFloat(discount);
    const grandTotal = netAmount;
    const remaining = grandTotal - parseFloat(advance);

    const updated = await Quotation.findByIdAndUpdate(
      req.params.id,
      { clientName, clientAddress, clientContact, items, subtotal, discount, netAmount, cgst: 0, sgst: 0, grandTotal, advance, remainingAmount: remaining },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update' });
  }
});

// DELETE /api/quotations/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Quotation.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// GET /api/quotations (all records)
router.get('/', async (req, res) => {
  try {
    const quotes = await Quotation.find().sort({ createdAt: -1 });
    const data = quotes.map(q => ({
      id: q._id,
      quotationNo: q.quotationNo,
      clientName: q.clientName,
      clientContact: q.clientContact,
      date: q.date ? new Date(q.date).toLocaleDateString('en-GB') : '',
      grandTotal: q.grandTotal,
      advance: q.advance,
      remainingAmount: q.remainingAmount
    }));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// POST /api/quotations (generate PDF)
router.post('/', async (req, res) => {
  try {
    const { clientName, clientAddress, clientContact, items, discount = 0, advance = 0 } = req.body;
    if (!clientName || !clientAddress || !clientContact || !items?.length) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const subtotal = items.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);
    const netAmount = subtotal - parseFloat(discount);
    const grandTotal = netAmount;
    const remaining = grandTotal - parseFloat(advance);

    const last = await Quotation.findOne().sort({ createdAt: -1 });
    const num = last ? parseInt(last.quotationNo.split('-')[1]) + 1 : 1001;
    const quotationNo = `Q-${num}`;

    const quote = new Quotation({
      quotationNo, clientName, clientAddress, clientContact,
      items, subtotal, discount, netAmount, cgst: 0, sgst: 0, grandTotal, advance, remainingAmount: remaining
    });
    await quote.save();

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers = [];
    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => {
      const pdf = Buffer.concat(buffers);
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=${quotationNo}.pdf`
      });
      res.end(pdf);
    });

    // Logo
    doc.image('public/logo.png', 170, 50, { width: 260 });
    doc.y = 140;

    // Business Info
    doc.fontSize(10).text('618,Shreeji park society,Hightention line road,Subhanpura,Vadodara-390021 Mo.9737888669', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text('INVOICE', { align: 'center' });
    doc.moveDown();

    // Client Info
    doc.fontSize(10);
    doc.text(`CLIENT NAME: ${clientName}`, 50, doc.y, { width: 250 });
    doc.text(`DATE: ${new Date().toLocaleDateString('en-GB')}`, 300, doc.y, { width: 250 });
    doc.moveDown(0.5);
    doc.text(`ADDRESS: ${clientAddress}`, 50, doc.y, { width: 250 });
    doc.text(`CONTACT NUMBER: ${clientContact}`, 300, doc.y, { width: 250 });
    doc.moveDown(2);

    // Items Table
    doc.font('Helvetica-Bold');
    doc.fontSize(10);
    doc.text('SL', 50, doc.y, { width: 30 });
    doc.text('Description', 85, doc.y, { width: 365 });
    doc.text('Amount', 460, doc.y, { width: 90, align: 'right' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    doc.font('Helvetica');
    doc.fontSize(10);
    items.forEach((item, i) => {
      doc.text(i + 1, 50, doc.y, { width: 30 });
      doc.text(item.description, 85, doc.y, { width: 365 });
      doc.text(parseFloat(item.amount).toLocaleString('en-IN'), 460, doc.y, { width: 90, align: 'right' });
      doc.moveDown();
    });
    doc.moveDown(1);

    // Financial Summary (NO CGST/SGST)
    const financials = [
      { label: 'SUB TOTAL', value: subtotal },
      { label: 'Less: Discount', value: discount },
      { label: 'Net Amount', value: netAmount },
      { label: 'GRAND TOTAL (inclusive of all taxes)', value: grandTotal, highlight: true },
      { label: 'Less: Advance', value: advance },
      { label: 'Remaining Amount', value: remaining }
    ];

    doc.font('Helvetica-Bold');
    doc.fontSize(10);
    doc.text('Description', 50, doc.y, { width: 300 });
    doc.text('Amount', 350, doc.y, { width: 200, align: 'right' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    doc.font('Helvetica');
    doc.fontSize(10);
    financials.forEach(row => {
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.2);

      if (row.highlight) {
        doc.font('Helvetica-Bold');
        doc.fillColor('#28a745');
      }
      doc.text(row.label, 50, doc.y, { width: 300 });
      doc.text(row.value.toLocaleString('en-IN'), 350, doc.y, { width: 200, align: 'right' });
      if (row.highlight) {
        doc.font('Helvetica');
        doc.fillColor('black');
      }

      doc.moveDown(0.2);
    });
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1);

    // New Line
    doc.fontSize(10).text('composition taxable person, not eligible to collect tax on supplies', 50, doc.y, { width: 500 });
    doc.moveDown(2);

    // Signature
    doc.text('For, FURNiSURE', 400, doc.y);
    doc.moveDown();
    doc.text('Partners', 400, doc.y);

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'PDF generation failed' });
  }
});

module.exports = router;