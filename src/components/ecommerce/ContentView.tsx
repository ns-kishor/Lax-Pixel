'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { ArrowLeft } from 'lucide-react';

const content: Record<string, { title: string; sections: { heading: string; body: string }[] }> = {
  about: {
    title: 'About Lax Pixel',
    sections: [
      {
        heading: 'Our Story',
        body: 'Lax Pixel was founded with a singular vision: to redefine luxury shopping through the power of artificial intelligence. We believe that the future of ecommerce lies at the intersection of timeless elegance and cutting-edge technology. Every product in our curated collection is handpicked by our AI systems, ensuring that only the finest pieces reach our discerning customers.',
      },
      {
        heading: 'AI-Powered Curation',
        body: 'Our proprietary AI algorithms analyze global fashion trends, customer preferences, and quality metrics to curate a selection that is truly exceptional. From luxury timepieces and designer eyewear to premium electronics and artisan fragrances, every category is continuously refined to deliver an unparalleled shopping experience.',
      },
      {
        heading: 'Our Commitment',
        body: 'We are committed to authenticity, quality, and customer satisfaction. Every item listed on Lax Pixel undergoes rigorous verification. Our real-time order tracking, AI-powered customer support, and seamless shopping experience reflect our dedication to excellence. We partner directly with brands and authorized sellers to guarantee genuine products.',
      },
    ],
  },
  faq: {
    title: 'Frequently Asked Questions',
    sections: [
      {
        heading: 'How do I place an order?',
        body: 'Browse our collections, add items to your bag, and proceed to checkout. You will need to create an account or sign in to complete your purchase. We accept all major payment methods.',
      },
      {
        heading: 'What is the shipping policy?',
        body: 'We offer free express shipping on all orders over $2,000. Standard orders are shipped within 1-3 business days. Express orders are delivered within 2-5 business days depending on your location. All orders include real-time tracking.',
      },
      {
        heading: 'How do I track my order?',
        body: 'Once your order is shipped, you will receive a tracking number. You can track your order anytime by clicking "Track Order" in the navigation or visiting the tracking page directly. Our system provides real-time updates from warehouse to doorstep.',
      },
      {
        heading: 'What is the return policy?',
        body: 'We accept returns within 30 days of delivery for items in their original, unused condition. All returns include free return shipping. Refunds are processed within 5-7 business days after we receive the returned item.',
      },
      {
        heading: 'How do I become a seller?',
        body: 'Click "Become a Seller" in the footer or sign up for a seller account during registration. After verification, you can list your luxury products and reach our global customer base. Our AI tools help optimize your listings for maximum visibility.',
      },
      {
        heading: 'Is my payment secure?',
        body: 'Absolutely. We use industry-standard encryption and secure payment processing. Your payment information is never stored on our servers. We support all major credit cards and digital payment methods.',
      },
    ],
  },
  returns: {
    title: 'Returns & Exchanges',
    sections: [
      {
        heading: 'Return Policy',
        body: 'We want you to be completely satisfied with your purchase. If for any reason you are not happy with your order, you may return eligible items within 30 days of delivery for a full refund.',
      },
      {
        heading: 'Eligibility',
        body: 'Items must be in their original condition, unworn, unwashed, and with all tags attached. All original packaging and accessories must be included. Items marked as "Final Sale" are not eligible for returns.',
      },
      {
        heading: 'How to Initiate a Return',
        body: 'Go to "My Orders" in your account, select the order you wish to return, and click "Request Return". You will receive a prepaid return shipping label via email. Pack the item securely and drop it off at any authorized shipping location.',
      },
      {
        heading: 'Refund Process',
        body: 'Once we receive and inspect your return, we will process your refund within 5-7 business days. The refund will be credited to your original payment method. You will receive a confirmation email once the refund is processed.',
      },
      {
        heading: 'Exchanges',
        body: 'For exchanges, please initiate a return and place a new order for the desired item. This ensures you get the correct item as quickly as possible without waiting for processing.',
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    sections: [
      {
        heading: 'Information We Collect',
        body: 'We collect information you provide directly, such as your name, email address, shipping address, and payment information when you create an account or place an order. We also automatically collect certain information about your device and browsing activity on our platform.',
      },
      {
        heading: 'How We Use Your Information',
        body: 'We use your information to process orders, provide customer support, personalize your shopping experience, improve our services, and communicate with you about orders, products, and promotions. Our AI systems use anonymized data to improve product recommendations.',
      },
      {
        heading: 'Data Security',
        body: 'We implement industry-standard security measures to protect your personal information. All data transmissions are encrypted using SSL/TLS. We regularly audit our security practices to ensure your data remains safe.',
      },
      {
        heading: 'Your Rights',
        body: 'You have the right to access, correct, or delete your personal information at any time. You can manage your data through your account settings or by contacting our support team. We comply with all applicable data protection regulations.',
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    sections: [
      {
        heading: 'Acceptance of Terms',
        body: 'By accessing and using Lax Pixel, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not use our services.',
      },
      {
        heading: 'Account Responsibilities',
        body: 'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate and complete information when creating an account.',
      },
      {
        heading: 'Product Listings & Pricing',
        body: 'All product listings are provided by verified sellers. While we strive for accuracy, we do not guarantee that all product information is error-free. Prices are subject to change without notice. We reserve the right to refuse or cancel any order.',
      },
      {
        heading: 'Seller Agreement',
        body: 'Sellers agree to list only authentic products, provide accurate descriptions, and fulfill orders in a timely manner. Sellers must comply with all applicable laws and regulations. Lax Pixel reserves the right to suspend seller accounts that violate these terms.',
      },
      {
        heading: 'Limitation of Liability',
        body: 'Lax Pixel provides the platform on an "as is" basis. We are not liable for any indirect, incidental, or consequential damages arising from your use of our services. Our total liability shall not exceed the amount paid by you for the relevant transaction.',
      },
    ],
  },
  contact: {
    title: 'Contact Us',
    sections: [
      {
        heading: 'Get in Touch',
        body: 'We would love to hear from you. Whether you have a question about our products, need assistance with an order, or want to explore partnership opportunities, our team is here to help.',
      },
      {
        heading: 'Customer Support',
        body: 'For order inquiries, returns, and general questions, you can reach our AI-powered support assistant available 24/7 via the chat widget. For complex issues, our human support team is available Monday through Friday, 9 AM to 6 PM.',
      },
      {
        heading: 'Business Inquiries',
        body: 'For seller partnerships, wholesale inquiries, and business collaborations, please reach out to us via WhatsApp using the Support link. Our business team typically responds within 24 hours.',
      },
    ],
  },
};

export function ContentView() {
  const { goBack } = useStore();

  // Read slug from URL path: /page/[slug]
  const getSlug = () => {
    const match = window.location.pathname.match(/^\/page\/([^/]+)$/);
    return match ? match[1] : 'about';
  };

  const slug = getSlug();
  const page = content[slug];

  useEffect(() => {
    if (!page) {
      goBack();
    }
    window.scrollTo(0, 0);
  }, [slug, page]);
  if (!page) return null;

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <button
          onClick={goBack}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        <h1 className="text-3xl sm:text-4xl font-extralight tracking-tight mb-10">{page.title}</h1>

        <div className="space-y-8">
          {page.sections.map((section, i) => (
            <div key={i} className="border-b border-border pb-8 last:border-0 last:pb-0">
              <h2 className="text-lg font-light tracking-wide mb-3">{section.heading}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{section.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
