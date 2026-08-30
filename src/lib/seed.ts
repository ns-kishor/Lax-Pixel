import { db } from '@/lib/db';
import { hash } from 'bcryptjs';

async function seed() {
  console.log('🌱 Seeding database...');

  // Create categories
  const categories = await Promise.all([
    db.category.upsert({ where: { slug: 'watches' }, update: {}, create: { name: 'Watches', slug: 'watches', description: 'Premium timepieces for the discerning collector' } }),
    db.category.upsert({ where: { slug: 'bags' }, update: {}, create: { name: 'Bags', slug: 'bags', description: 'Luxury leather goods and accessories' } }),
    db.category.upsert({ where: { slug: 'eyewear' }, update: {}, create: { name: 'Eyewear', slug: 'eyewear', description: 'Designer sunglasses and optical frames' } }),
    db.category.upsert({ where: { slug: 'fragrances' }, update: {}, create: { name: 'Fragrances', slug: 'fragrances', description: 'Exquisite perfumes and colognes' } }),
    db.category.upsert({ where: { slug: 'electronics' }, update: {}, create: { name: 'Electronics', slug: 'electronics', description: 'Premium technology and audio' } }),
    db.category.upsert({ where: { slug: 'footwear' }, update: {}, create: { name: 'Footwear', slug: 'footwear', description: 'Designer shoes and sneakers' } }),
  ]);

  // Create seller user
  const sellerPassword = await hash('seller123', 12);
  const seller = await db.user.upsert({
    where: { email: 'seller@noir.com' },
    update: {},
    create: {
      email: 'seller@noir.com',
      password: sellerPassword,
      name: 'Noir Luxury Group',
      role: 'SELLER',
      phone: '+1-888-LAX-LUX',
      address: '123 Luxury Ave',
      city: 'New York',
      country: 'United States',
      zipCode: '10001',
    },
  });

  // Create seller profile
  await db.sellerProfile.upsert({
    where: { userId: seller.id },
    update: {},
    create: {
      userId: seller.id,
      companyName: 'Noir Luxury Group',
      description: 'Curating the finest luxury goods from around the world. Each piece is selected for its exceptional craftsmanship and timeless design.',
      approved: true,
      rating: 4.9,
      totalSales: 2847,
    },
  });

  // Create buyer user
  const buyerPassword = await hash('buyer123', 12);
  const buyer = await db.user.upsert({
    where: { email: 'buyer@noir.com' },
    update: {},
    create: {
      email: 'buyer@noir.com',
      password: buyerPassword,
      name: 'Alex Morgan',
      role: 'BUYER',
      phone: '+1-555-0123',
      address: '456 Elegant Street',
      city: 'Los Angeles',
      country: 'United States',
      zipCode: '90001',
    },
  });

  // Create products
  const products = [
    {
      name: 'Chronos Elite', slug: 'chronos-elite', description: 'A masterpiece of horological engineering. The Chronos Elite features a Swiss-made automatic movement housed in a 42mm brushed titanium case. The silver sunburst dial displays time with refined stick indices and dauphine hands, while the sapphire crystal ensures enduring clarity. Water resistant to 100 meters, this timepiece seamlessly transitions from boardroom to black-tie events.', price: 4999.00, comparePrice: 5999.00, image: '/products/watch.png', categoryId: categories[0].id, sellerId: seller.id, stock: 15, featured: true, rating: 4.9, reviewCount: 127, salesCount: 342, tags: 'luxury,watch,premium,swiss,titanium', aiTags: 'bestseller,award-winning,investment-piece', aiGenerated: false,
    },
    {
      name: 'Noir Leather Tote', slug: 'noir-leather-tote', description: 'Handcrafted from full-grain Italian calfskin leather, the Noir Tote embodies understated luxury. Its spacious interior features a suede-lined compartment with magnetic closure, while the exterior showcases minimal hardware in brushed palladium. Each bag is individually finished by master artisans in Florence, ensuring every piece carries a unique character that improves with age.', price: 2899.00, comparePrice: 3499.00, image: '/products/bag.png', categoryId: categories[1].id, sellerId: seller.id, stock: 22, featured: true, rating: 4.8, reviewCount: 89, salesCount: 256, tags: 'luxury,bag,leather,italian,handcrafted', aiTags: 'trending,editor-pick,artisan-made', aiGenerated: false,
    },
    {
      name: 'Eclipse Aviator', slug: 'eclipse-aviator', description: 'The Eclipse Aviator redefines classic eyewear with a contemporary edge. Precision-machined from lightweight titanium, these frames feature polarized Zeiss lenses with anti-reflective coating. The adjustable nose pads and temple tips ensure a perfect fit, while the signature bridge design adds an unmistakable mark of sophistication to any ensemble.', price: 899.00, comparePrice: 1099.00, image: '/products/sunglasses.png', categoryId: categories[2].id, sellerId: seller.id, stock: 45, featured: true, rating: 4.7, reviewCount: 203, salesCount: 587, tags: 'luxury,sunglasses,aviator,titanium,zeiss', aiTags: 'bestseller,celebrity-favorite,uv-protection', aiGenerated: false,
    },
    {
      name: 'Velvet Oud', slug: 'velvet-oud', description: 'An intoxicating blend of rare oud wood, Bulgarian rose, and warm amber. Velvet Oud opens with a burst of bergamot and saffron before revealing a heart of rich oud and Turkish rose. The base settles into a sensual blend of sandalwood, vanilla, and musk. Housed in a hand-blown black glass flacon with a 24k gold-plated cap, this fragrance is a statement of refined indulgence.', price: 599.00, comparePrice: 749.00, image: '/products/perfume.png', categoryId: categories[3].id, sellerId: seller.id, stock: 60, featured: true, rating: 4.8, reviewCount: 156, salesCount: 423, tags: 'luxury,perfume,oud,fragrance,artisanal', aiTags: 'bestseller,unisex,limited-edition', aiGenerated: false,
    },
    {
      name: 'Aura Pro Headphones', slug: 'aura-pro-headphones', description: 'Immerse yourself in pure sonic excellence with the Aura Pro. Featuring 50mm beryllium drivers and adaptive active noise cancellation, these over-ear headphones deliver studio-quality audio. The memory foam ear cushions wrapped in premium lambskin provide all-day comfort, while the 40-hour battery life ensures uninterrupted listening. Constructed from anodized aluminum and matte-black protein leather.', price: 1299.00, comparePrice: 1599.00, image: '/products/headphones.png', categoryId: categories[4].id, sellerId: seller.id, stock: 35, featured: true, rating: 4.9, reviewCount: 312, salesCount: 891, tags: 'luxury,headphones,audio,wireless,anc', aiTags: 'bestseller,audiophile-choice,award-winning', aiGenerated: false,
    },
    {
      name: 'Phantom Runner', slug: 'phantom-runner', description: 'Where high fashion meets athletic performance. The Phantom Runner features a seamless knit upper in premium black merino wool, paired with a sculpted sole unit made from recycled carbon fiber. The innovative lacing system disappears into the tongue for a clean aesthetic, while the cushioned insole provides responsive support for all-day wear. Each pair is numbered and comes in a premium black box.', price: 799.00, comparePrice: 949.00, image: '/products/sneakers.png', categoryId: categories[5].id, sellerId: seller.id, stock: 50, featured: false, rating: 4.6, reviewCount: 78, salesCount: 198, tags: 'luxury,sneakers,designer,wool,sustainable', aiTags: 'new-arrival,sustainable-fashion,limited-run', aiGenerated: false,
    },
    {
      name: 'Nova Ultra', slug: 'nova-ultra', description: 'The Nova Ultra represents the pinnacle of mobile technology. Its 6.8-inch LTPO AMOLED display delivers true blacks and 120Hz fluid motion. Powered by the latest silicon, it handles anything from intensive creative work to seamless multitasking. The ceramic back and titanium frame create a device that is both beautiful and resilient. A 50MP main camera system captures stunning images in any light.', price: 2499.00, comparePrice: 2799.00, image: '/products/phone.png', categoryId: categories[4].id, sellerId: seller.id, stock: 28, featured: true, rating: 4.8, reviewCount: 245, salesCount: 634, tags: 'luxury,smartphone,premium,titanium,camera', aiTags: 'flagship,best-camera,performance-king', aiGenerated: false,
    },
    {
      name: 'Zenith Pro 16', slug: 'zenith-pro-16', description: 'Engineered for creators who demand excellence. The Zenith Pro 16 features a 16-inch mini-LED display with 1600 nits peak brightness and ProMotion technology. The next-generation processor delivers up to 22 hours of battery life, while the silent fanless design ensures zero distractions. Machined from a single block of recycled aluminum, its unibody design is both stunning and incredibly durable.', price: 3499.00, comparePrice: 3999.00, image: '/products/laptop.png', categoryId: categories[4].id, sellerId: seller.id, stock: 18, featured: true, rating: 4.9, reviewCount: 167, salesCount: 445, tags: 'luxury,laptop,creator,premium,aluminum', aiTags: 'bestseller,creator-essential,performance', aiGenerated: false,
    },
  ];

  for (const product of products) {
    await db.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: product,
    });
  }

  // Create some reviews for the first product
  const allProducts = await db.product.findMany();
  const reviewData = [
    { userId: buyer.id, productId: allProducts[0].id, rating: 5, title: 'Exceptional craftsmanship', comment: 'The Chronos Elite exceeded all my expectations. The weight is perfect, the movement is incredibly smooth, and the dial catches light beautifully. This is a watch that commands respect without being ostentatious.' },
    { userId: buyer.id, productId: allProducts[1].id, rating: 5, title: 'Worth every penny', comment: 'The leather quality is outstanding. You can smell the craftsmanship. The interior lining is a lovely touch and the bag holds its shape perfectly even when empty.' },
    { userId: buyer.id, productId: allProducts[4].id, rating: 5, title: 'Audio perfection', comment: 'As an audio engineer, I am incredibly impressed with the Aura Pro. The sound stage is wide, the bass is tight, and the noise cancellation is the best I have experienced. The build quality is exceptional.' },
  ];

  for (const review of reviewData) {
    await db.review.upsert({
      where: { userId_productId: { userId: review.userId, productId: review.productId } },
      update: {},
      create: review,
    });
  }

  // Create a sample order for the buyer
  const orderNumber = `NOR-${Date.now().toString(36).toUpperCase()}`;
  const sampleOrder = await db.order.create({
    data: {
      orderNumber,
      userId: buyer.id,
      status: 'SHIPPED',
      totalAmount: 4999.00,
      subtotal: 4899.00,
      shippingCost: 50.00,
      tax: 50.00,
      shippingAddress: '456 Elegant Street',
      shippingCity: 'Los Angeles',
      shippingCountry: 'United States',
      shippingZip: '90001',
      paymentMethod: 'CREDIT_CARD',
      paymentStatus: 'PAID',
      trackingNumber: 'NOR-TRK-2024-001',
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      items: {
        create: {
          productId: allProducts[0].id,
          productName: allProducts[0].name,
          productImage: allProducts[0].image,
          price: allProducts[0].price,
          quantity: 1,
        },
      },
      tracking: {
        create: [
          { status: 'ORDERED', description: 'Order placed successfully', location: 'Online', timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
          { status: 'CONFIRMED', description: 'Order confirmed and being prepared', location: 'New York Warehouse', timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
          { status: 'PROCESSING', description: 'Order is being quality-checked and packaged', location: 'New York Warehouse', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
          { status: 'SHIPPED', description: 'Package shipped via express delivery', location: 'New York Distribution Center', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
        ],
      },
    },
  });

  // Create admin account
  const adminPassword = await hash('admin123', 12);
  await db.admin.upsert({
    where: { email: 'admin@laxpixel.com' },
    update: {},
    create: {
      email: 'admin@laxpixel.com',
      password: adminPassword,
      name: 'Admin',
      role: 'SUPER_ADMIN',
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log(`   Categories: ${categories.length}`);
  console.log(`   Products: ${products.length}`);
  console.log(`   Users: 2 (buyer@noir.com / seller@noir.com)`);
  console.log(`   Admin: admin@laxpixel.com / admin123`);
  console.log(`   Sample Order: ${sampleOrder.orderNumber}`);
}

seed().catch(console.error);
