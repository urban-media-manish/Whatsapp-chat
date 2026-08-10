import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import { Customer } from '../models/Customer.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp_support';

async function mergeDuplicateChats() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Connected to MongoDB for deep deduplication script...');

    const customers = await Customer.find({});
    console.log(`Found total ${customers.length} customer records in database.`);

    // Group customers by normalized key (Phone or First Word of Name)
    const namePhoneMap = new Map();

    for (const cust of customers) {
      const cleanName = (cust.name || '').toLowerCase().trim();
      const firstWordName = cleanName.split(' ')[0] || cleanName;
      // Key is first word of name if provided, else phone
      const key = (firstWordName && firstWordName !== 'anonymous' && !firstWordName.startsWith('guest_'))
        ? firstWordName
        : (cust.phone ? cust.phone.trim() : cust._id.toString());

      if (!namePhoneMap.has(key)) {
        namePhoneMap.set(key, [cust]);
      } else {
        namePhoneMap.get(key).push(cust);
      }
    }

    for (const [key, custGroup] of namePhoneMap.entries()) {
      if (custGroup.length > 1) {
        console.log(`\nMerging ${custGroup.length} duplicate customer accounts for key: '${key}'`);
        
        // Primary customer is the first one created or the one with a real phone number
        const primaryCustomer = custGroup.find(c => c.phone && !c.phone.startsWith('+1 (')) || custGroup[0];
        const duplicateCustomers = custGroup.filter(c => c._id.toString() !== primaryCustomer._id.toString());

        // Find all conversations for all customers in this group
        const allCustIds = custGroup.map(c => c._id);
        const conversations = await Conversation.find({ customer: { $in: allCustIds } }).sort({ createdAt: 1 });

        if (conversations.length > 0) {
          const primaryConv = conversations[0];
          primaryConv.customer = primaryCustomer._id;
          await primaryConv.save();

          // Move all messages from other conversations into primaryConv
          const duplicateConvs = conversations.slice(1);
          for (const dupConv of duplicateConvs) {
            const result = await Message.updateMany(
              { conversation: dupConv._id },
              { $set: { conversation: primaryConv._id } }
            );
            console.log(`Moved ${result.modifiedCount} messages from conversation ${dupConv._id} into primary ${primaryConv._id}`);
            await Conversation.findByIdAndDelete(dupConv._id);
          }

          // Move any stray messages for duplicate customers to primaryConv
          for (const dupCust of duplicateCustomers) {
            await Message.updateMany(
              { senderId: dupCust._id.toString() },
              { $set: { senderId: primaryCustomer._id.toString(), senderName: primaryCustomer.name } }
            );
          }
        }

        // Delete duplicate customer records
        for (const dupCust of duplicateCustomers) {
          await Customer.findByIdAndDelete(dupCust._id);
          console.log(`Deleted duplicate customer record: ${dupCust._id} (${dupCust.name})`);
        }
      }
    }

    // Final sweep: ensure max 1 conversation per customer ID
    const allConvs = await Conversation.find({}).sort({ createdAt: 1 });
    const seenCustConvs = new Map();

    for (const conv of allConvs) {
      const custId = conv.customer ? conv.customer.toString() : null;
      if (!custId) continue;

      if (!seenCustConvs.has(custId)) {
        seenCustConvs.set(custId, conv);
      } else {
        const primaryConv = seenCustConvs.get(custId);
        const result = await Message.updateMany(
          { conversation: conv._id },
          { $set: { conversation: primaryConv._id } }
        );
        console.log(`Final sweep: moved ${result.modifiedCount} messages from ${conv._id} into ${primaryConv._id}`);
        await Conversation.findByIdAndDelete(conv._id);
      }
    }

    console.log('\n✅ Deep Deduplication & Full Chat Merge Complete!');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

mergeDuplicateChats();
