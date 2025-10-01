import type { Metadata } from 'next';

interface BuildMetadataInput {
  title?: string;
  description?: string;
  keywords?: string[];
  canonical?: string;
  noindex?: boolean;
  image?: {
    url: string;
    alt?: string;
    width?: number;
    height?: number;
  };
  type?: 'website' | 'article' | 'profile';
  publishedTime?: string;
  modifiedTime?: string;
  themeColor?: string;
}

/**
 * Creates default SEO values for consistent branding
 */
export function createSEODefaults() {
  return {
    title: "ManageHub",
    description: "Smart Hub & Workspace Management System",
    keywords: ["workspace", "management", "productivity", "hub", "organization", "collaboration", "efficiency"],
    siteName: "ManageHub",
    locale: "en_US",
    type: "website" as const,
  };
}

/**
 * Builds a Next.js Metadata object with SEO optimizations
 * 
 * @param input - Configuration object for metadata generation
 * @returns Metadata object compatible with Next.js App Router
 */
export function buildMetadata(input: BuildMetadataInput = {}): Metadata {
  const defaults = createSEODefaults();
  
  const {
    title,
    description = defaults.description,
    keywords = defaults.keywords,
    canonical,
    noindex = false,
    image,
    type = defaults.type,
    publishedTime,
    modifiedTime,
    themeColor = '#000000',
  } = input;

  // Build the metadata object
  const metadata: Metadata = {
    // Title configuration - let the layout handle the template
    title,
    
    // Description
    description,
    
    // Keywords
    keywords,
    
    // Theme color
    themeColor,
    
    // Robots configuration
    robots: {
      index: !noindex,
      follow: !noindex,
      googleBot: {
        index: !noindex,
        follow: !noindex,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    
    // Open Graph
    openGraph: {
      type,
      title: title || defaults.title,
      description,
      siteName: defaults.siteName,
      locale: defaults.locale,
      ...(image && {
        images: [{
          url: image.url,
          alt: image.alt || title || defaults.title,
          width: image.width || 1200,
          height: image.height || 630,
        }]
      }),
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
    },
    
    // Twitter Card
    twitter: {
      card: 'summary_large_image',
      title: title || defaults.title,
      description,
      ...(image && {
        images: [{
          url: image.url,
          alt: image.alt || title || defaults.title,
        }]
      })
    },
    
    // Viewport
    viewport: {
      width: 'device-width',
      initialScale: 1,
      maximumScale: 1,
    },
  };

  // Add canonical URL if provided
  if (canonical) {
    metadata.alternates = {
      canonical
    };
  }

  return metadata;
}

/**
 * Utility function to create page-specific metadata
 * 
 * @param title - Page title
 * @param description - Page description
 * @param options - Additional options
 * @returns Metadata object
 */
export function createPageMetadata(
  title: string,
  description?: string,
  options: Omit<BuildMetadataInput, 'title' | 'description'> = {}
): Metadata {
  return buildMetadata({
    title,
    description,
    ...options
  });
}

/**
 * Utility function for article/blog post metadata
 * 
 * @param title - Article title
 * @param description - Article description
 * @param options - Additional options
 * @returns Metadata object
 */
export function createArticleMetadata(
  title: string,
  description?: string,
  options: Omit<BuildMetadataInput, 'title' | 'description' | 'type'> = {}
): Metadata {
  return buildMetadata({
    title,
    description,
    type: 'article',
    ...options
  });
}