const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const methods = [
  {
    name: 'bKash',
    description: 'bKash Personal / Merchant Payment',
    icon: '/payment-methods/bkash.png',
    proofRequired: 'TRANSACTION_ID',
    instructions: 'Send money / payment to bKash number: 017XXXXXXXX (Personal/Merchant). Enter the Transaction ID (TrxID) and your bKash phone number below.',
    active: true,
    sortOrder: 1,
  },
  {
    name: 'Nagad',
    description: 'Nagad Personal / Merchant Payment',
    icon: '/payment-methods/nagad.png',
    proofRequired: 'TRANSACTION_ID',
    instructions: 'Send money to Nagad number: 018XXXXXXXX. Enter the Transaction ID (TrxID) and your Nagad phone number below.',
    active: true,
    sortOrder: 2,
  },
  {
    name: 'Rocket',
    description: 'DBBL Rocket Mobile Payment',
    icon: '/payment-methods/rocket.png',
    proofRequired: 'TRANSACTION_ID',
    instructions: 'Send money to Rocket number: 019XXXXXXXX. Enter the Transaction ID (TrxID) and your Rocket phone number below.',
    active: true,
    sortOrder: 3,
  },
  {
    name: 'Upay',
    description: 'UCB Upay Mobile Payment',
    icon: '/payment-methods/upay.png',
    proofRequired: 'TRANSACTION_ID',
    instructions: 'Send money to Upay number: 016XXXXXXXX. Enter the Transaction ID (TrxID) and your Upay phone number below.',
    active: true,
    sortOrder: 4,
  },
  {
    name: 'mCash',
    description: 'Islami Bank mCash Payment',
    icon: '/payment-methods/mcash.webp',
    proofRequired: 'TRANSACTION_ID',
    instructions: 'Send money to mCash number: 01XXXXXXXXX. Enter the Transaction ID (TrxID) and your mCash phone number below.',
    active: true,
    sortOrder: 5,
  },
  {
    name: 'GPay',
    description: 'Grameenphone GPay Payment',
    icon: '/payment-methods/gpay.png',
    proofRequired: 'TRANSACTION_ID',
    instructions: 'Send payment via GPay. Enter the Transaction ID (TrxID) and your registered phone number below.',
    active: true,
    sortOrder: 6,
  },
  {
    name: 'Cellfin',
    description: 'Islami Bank Cellfin Payment',
    icon: '/payment-methods/cellfin.jpg',
    proofRequired: 'TRANSACTION_ID',
    instructions: 'Transfer funds via Cellfin wallet. Enter the Transaction ID / Reference and your sender phone number below.',
    active: true,
    sortOrder: 7,
  },
  {
    name: 'Mukto-Pay',
    description: 'Mukto-Pay Digital Payment',
    icon: '/payment-methods/muktopay.webp',
    proofRequired: 'TRANSACTION_ID',
    instructions: 'Pay via Mukto-Pay. Enter the Transaction ID and your sender phone number below.',
    active: true,
    sortOrder: 8,
  },
  {
    name: 'Nexus-Pay',
    description: 'Dutch-Bangla Bank NexusPay',
    icon: '/payment-methods/nexuspay.png',
    proofRequired: 'TRANSACTION_ID',
    instructions: 'Send money / payment via NexusPay. Enter the Reference / Transaction ID and your sender number below.',
    active: true,
    sortOrder: 9,
  },
  {
    name: 'Pathao-Pay',
    description: 'Pathao Pay Digital Payment',
    icon: '/payment-methods/pathaopay.png',
    proofRequired: 'TRANSACTION_ID',
    instructions: 'Send money via Pathao Pay. Enter the Transaction ID and your sender phone number below.',
    active: true,
    sortOrder: 10,
  },
  {
    name: 'cash_on_delivery',
    description: 'Cash on Delivery (ক্যাশ অন ডেলিভারি)',
    icon: '/payment-methods/cash_on_delivery.jpg',
    proofRequired: null,
    instructions: 'Pay cash when you receive the order at your doorstep. No advance payment required.',
    active: true,
    sortOrder: 11,
  },
];

async function main() {
  console.log('Upserting 11 payment methods...');
  for (const m of methods) {
    const existing = await prisma.paymentMethod.findFirst({
      where: {
        OR: [
          { name: m.name },
          ...(m.name === 'cash_on_delivery' ? [{ name: 'Cash on Delivery' }, { name: 'COD' }] : [])
        ]
      }
    });

    if (existing) {
      await prisma.paymentMethod.update({
        where: { id: existing.id },
        data: {
          name: m.name,
          description: m.description,
          icon: m.icon,
          proofRequired: m.proofRequired,
          instructions: m.instructions,
          active: true,
          sortOrder: m.sortOrder,
        }
      });
      console.log(`Updated: ${m.name}`);
    } else {
      await prisma.paymentMethod.create({
        data: m
      });
      console.log(`Created: ${m.name}`);
    }
  }

  // Also ensure default siteSetting for seller_verification_fee exists
  const existingFee = await prisma.siteSetting.findUnique({
    where: { key: 'seller_verification_fee' }
  });
  if (!existingFee) {
    await prisma.siteSetting.create({
      data: {
        key: 'seller_verification_fee',
        value: '500' // Default 500 BDT
      }
    });
    console.log('Created default seller_verification_fee: 500 BDT');
  } else {
    console.log(`Existing seller_verification_fee is: ${existingFee.value} BDT`);
  }

  console.log('Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
