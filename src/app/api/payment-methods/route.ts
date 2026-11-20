import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let sellerId = searchParams.get('sellerId');
    const productId = searchParams.get('productId');
    const productIdsParam = searchParams.get('productIds');

    // Resolve sellerId from productId or productIds if not explicitly passed
    if (!sellerId && (productId || productIdsParam)) {
      const ids = productIdsParam ? productIdsParam.split(',').map(s => s.trim()).filter(Boolean) : (productId ? [productId] : []);
      if (ids.length > 0) {
        const products = await db.product.findMany({
          where: { id: { in: ids } },
          select: { sellerId: true },
        });
        if (products.length > 0) {
          sellerId = products[0].sellerId;
        }
      }
    }

    // Always fetch system payment methods for icons, defaults, and fallback
    const rawSystemMethods = await db.paymentMethod.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });

    const systemMethods = rawSystemMethods.map((m) => {
      const isCod = m.name === 'cash_on_delivery' || m.name === 'Cash on Delivery' || m.name === 'COD';
      const phoneMatch = m.instructions?.match(/01[3-9]\d{8}/);
      const isMerchant = /merchant/i.test(m.instructions || '') || /merchant/i.test(m.description || '');
      const accountNumber = m.accountNumber || (phoneMatch ? phoneMatch[0] : null);
      const accountType = m.accountType || (isMerchant ? 'MERCHANT' : 'PERSONAL');
      return {
        ...m,
        accountNumber: isCod ? null : accountNumber,
        accountType: isCod ? null : accountType,
      };
    });

    // If sellerId is present, check if seller has custom payment methods configured
    if (sellerId) {
      const seller = await db.user.findUnique({
        where: { id: sellerId },
        include: { sellerProfile: true },
      });

      if (seller?.sellerProfile?.paymentMethodsConfig) {
        try {
          const parsedConfig = JSON.parse(seller.sellerProfile.paymentMethodsConfig);
          if (Array.isArray(parsedConfig)) {
            const activeSellerConfigs = parsedConfig.filter((c: any) => c && c.active);
            if (activeSellerConfigs.length > 0) {
              const systemMap = new Map(systemMethods.map(m => [m.name.toLowerCase(), m]));

              const sellerMethods = activeSellerConfigs.map((c: any) => {
                const sys = systemMap.get(String(c.name || '').toLowerCase());
                const isCod = String(c.name || '').toLowerCase() === 'cash_on_delivery' ||
                              String(c.name || '').toLowerCase() === 'cash on delivery' ||
                              String(c.name || '').toLowerCase() === 'cod';

                let defaultInstruction = sys?.instructions || '';
                if (!isCod && c.accountNumber) {
                  defaultInstruction = `Send money to ${c.name} ${c.accountType || 'Personal'} number: ${c.accountNumber}. Enter TrxID and your sender number below.`;
                }

                return {
                  id: sys?.id || `seller-${c.name}`,
                  name: sys?.name || c.name,
                  icon: sys?.icon || '/payment-methods/bkash.png',
                  description: !isCod && c.accountType
                    ? `${c.name} (${c.accountType})`
                    : (sys?.description || c.name),
                  proofRequired: isCod ? null : (sys?.proofRequired || 'TRANSACTION_ID'),
                  instructions: c.instructions || defaultInstruction,
                  accountNumber: c.accountNumber || null,
                  accountType: c.accountType || null,
                  sellerId: seller.id,
                  sellerName: seller.sellerProfile?.companyName || seller.name,
                  sellerPhone: seller.sellerProfile?.phone || seller.phone,
                  sellerWhatsapp: seller.sellerProfile?.whatsapp || null,
                  sellerEmail: seller.sellerProfile?.email || seller.email,
                  active: true,
                  sortOrder: sys?.sortOrder ?? 99,
                };
              });

              sellerMethods.sort((a, b) => a.sortOrder - b.sortOrder);

              return NextResponse.json({
                methods: sellerMethods,
                isSellerMethods: true,
                seller: {
                  id: seller.id,
                  name: seller.sellerProfile?.companyName || seller.name,
                  phone: seller.sellerProfile?.phone || seller.phone,
                  whatsapp: seller.sellerProfile?.whatsapp || null,
                  email: seller.sellerProfile?.email || seller.email,
                },
              });
            }
          }
        } catch (e) {
          console.error('Error parsing seller payment methods config:', e);
        }
      }
    }

    // Default: return system payment methods (used by Admin products or when seller has no override)
    return NextResponse.json({
      methods: systemMethods,
      isSellerMethods: false,
    });
  } catch (error) {
    console.error('Failed to fetch payment methods:', error);
    return NextResponse.json({ error: 'Failed to fetch payment methods' }, { status: 500 });
  }
}
