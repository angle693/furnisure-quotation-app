require('dotenv').config();
const mongoose = require('mongoose');
const Quotation = require('./models/Quotation');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  await Quotation.deleteMany({});

  const sample = new Quotation({
    quotationNo: "Q-1001",
    clientName: "Mr. Hardik",
    clientAddress: "Vadodara",
    clientContact: "8460656416",
    date: new Date("2025-10-13"),
    items: [
      { description: "Storage Puffy 2 nos x 5500", amount: 54400 },
      { description: "Transportation", amount: 10000 },
      { description: "Sofa 17 rft", amount: 11000 },
      { description: "Center table With Drawer", amount: 800 }
    ],
    subtotal: 76200,
    discount: 16200,
    netAmount: 60000,
    cgst: 0,
    sgst: 0,
    grandTotal: 60000,
    advance: 30000,
    remainingAmount: 30000
  });
  await sample.save();
  console.log('✅ Seeded');
  mongoose.connection.close();
};

seed().catch(err => {
  console.error(err);
  mongoose.connection.close();
});