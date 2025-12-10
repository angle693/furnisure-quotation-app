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


module.exports = router;