const mongoose = require('mongoose');
const itemSchema = new mongoose.Schema({ description: String, amount: Number });
module.exports = mongoose.model('Quotation', new mongoose.Schema({
  quotationNo: { type: String, required: true, unique: true },
  clientName: String,
  clientAddress: String,
  clientContact: String,
  date: { type: Date, default: Date.now },
  items: [itemSchema],
  subtotal: Number,
  discount: { type: Number, default: 0 },
  netAmount: Number,
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  grandTotal: Number,
  advance: { type: Number, default: 0 },
  remainingAmount: Number
}, { timestamps: true }));