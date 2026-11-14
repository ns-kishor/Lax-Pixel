const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Syncing featured products into HeroSlide table...');
  const featuredProducts = await prisma.product.findMany({
    where: { featured: true },
    orderBy: { createdAt: 'asc' },
  });

  const existingSlides = await prisma.heroSlide.findMany();
  const existingProductIds = new Set(existingSlides.map(s => s.productId));

  let order = 1;
  for (const product of featuredProducts) {
    if (!existingProductIds.has(product.id)) {
      await prisma.heroSlide.create({
        data: {
          productId: product.id,
          sortOrder: order++,
          active: true,
        },
      });
      console.log(`Created hero slide for: ${product.name}`);
    } else {
      console.log(`Hero slide already exists for: ${product.name}`);
    }
  }

  const allSlides = await prisma.heroSlide.findMany({
    include: { product: true },
    orderBy: { sortOrder: 'asc' },
  });
  console.log('Total HeroSlides in DB now:', allSlides.length);
  for (const s of allSlides) {
    console.log(`- Slide ID: ${s.id} | Product: ${s.product?.name} | Active: ${s.active} | Sort: ${s.sortOrder}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
