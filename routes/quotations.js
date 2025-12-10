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
    const cgst = 0;
    const sgst = 0;
    const grandTotal = netAmount;
    const remaining = grandTotal - parseFloat(advance);

    const updated = await Quotation.findByIdAndUpdate(
      req.params.id,
      { clientName, clientAddress, clientContact, items, subtotal, discount, netAmount, cgst, sgst, grandTotal, advance, remainingAmount: remaining },
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

// GET /api/quotations
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

// POST /api/quotations — EXACT MR HARDIK FORMAT
router.post('/', async (req, res) => {
  try {
    const { clientName, clientAddress, clientContact, items, discount = 0, advance = 0 } = req.body;
    if (!clientName || !clientAddress || !clientContact || !items?.length) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const subtotal = items.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);
    const netAmount = subtotal - parseFloat(discount);
    const cgst = 0;
    const sgst = 0;
    const grandTotal = netAmount;
    const remaining = grandTotal - parseFloat(advance);

    const last = await Quotation.findOne().sort({ createdAt: -1 });
    const num = last ? parseInt(last.quotationNo.split('-')[1]) + 1 : 1001;
    const quotationNo = `Q-${num}`;

    const quote = new Quotation({
      quotationNo, clientName, clientAddress, clientContact,
      items, subtotal, discount, netAmount, cgst, sgst, grandTotal, advance, remainingAmount: remaining
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

    // Business Info (EXACT STRING FROM PDF)
    doc.fontSize(10).text('618,Shreeji park society,Hightention line road,Subhanpura,Vadodara-390021 Mo.9737888669', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text('INVOICE', { align: 'center' });
    doc.moveDown();

    // Client Info in 2 columns (EXACT MR HARDIK FORMAT)
    doc.fontSize(10);
    doc.text(`CLIENT NAME: ${clientName}`, 50, doc.y, { width: 250 });
    doc.text(`DATE: ${new Date().toLocaleDateString('en-GB')}`, 300, doc.y, { width: 250 });
    doc.moveDown();
    doc.text(`ADDRESS: ${clientAddress}`, 50, doc.y, { width: 250 });
    doc.text(`CONTACT NUMBER: ${clientContact}`, 300, doc.y, { width: 250 });
    doc.moveDown(10);

    // Table Header
    doc.font('Helvetica-Bold');
    doc.text('SL', 50, doc.y, { width: 30 });
    doc.text('Description', 85, doc.y, { width: 365 });
    doc.text('Amount', 460, doc.y, { width: 90, align: 'right' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // Items
    doc.font('Helvetica');
    items.forEach((item, i) => {
      doc.text(i + 1, 50, doc.y, { width: 30 });
      doc.text(item.description, 85, doc.y, { width: 365 });
      doc.text(parseFloat(item.amount).toLocaleString('en-IN'), 460, doc.y, { width: 90, align: 'right' });
      doc.moveDown();
    });
    doc.moveDown();

    // FINANCIAL LINE — EXACT SINGLE-LINE FORMAT FROM PDF
    doc.fontSize(10).text(
      `SUB TOTAL ${subtotal.toLocaleString('en-IN')} ` +
      `Less: Discount ${discount.toLocaleString('en-IN')} ` +
      `Net Amount ${netAmount.toLocaleString('en-IN')} ` +
      `CGST 9% ${cgst} ` +
      `SGST 9% ${sgst} ` +
      `GRAND TOTAL(inclusive of all taxes) ${grandTotal.toLocaleString('en-IN')} ` +
      `Less: Advance ${advance.toLocaleString('en-IN')} ` +
      `Remaining Amount ${remaining.toLocaleString('en-IN')}`,
      50, doc.y, { width: 500 }
    );
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