export type MediaType = "image" | "video" | "glb";

export type SectionStatus = "published" | "hidden";
export type ProductStatus = "published" | "draft" | "coming_soon";

export type CatalogSection = {
  id: string;
  parentId: string | null;
  slug: string;
  title: string;
  description: string;
  sortOrder: number;
  status: SectionStatus;
};

export type ProductMedia = {
  id: string;
  type: MediaType;
  url: string;
  posterUrl?: string;
  mime: string;
  bytes: number;
  sortOrder: number;
  isCover?: boolean;
  alt?: string;
  width?: number;
  height?: number;
  createdAt: string;
};

export type ProductSpec = { label: string; value: string };

export type Product = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  tagline: string;
  description: string;
  sectionId: string;
  sortOrder: number;
  priceRub: number | null;
  priceFrom: boolean;
  inStock: boolean;
  loadGrams: number | null;
  material: string;
  colors: string[];
  specs: ProductSpec[];
  media: ProductMedia[];
  marketplace: { ozonUrl?: string; wildberriesUrl?: string };
  seo: { title: string; description: string };
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
};

export type ArticleStatus = "published" | "draft";

export type Article = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverUrl: string | null;
  coverAlt: string;
  /** Sanitized HTML produced by the admin rich-text editor. */
  bodyHtml: string;
  status: ArticleStatus;
  /** YYYY-MM-DD; a published article stays hidden until this date (Moscow time). */
  publishedAt: string;
  sortOrder: number;
  relatedProductIds: string[];
  seo: { title: string; description: string };
  createdAt: string;
  updatedAt: string;
};

export type Database = {
  version: 1;
  sections: CatalogSection[];
  products: Product[];
  articles: Article[];
};

export type SectionNode = CatalogSection & { children: SectionNode[]; productCount: number };
