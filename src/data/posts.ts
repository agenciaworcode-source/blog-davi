export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  reading_time: string;
  source: { name: string; url: string };
  cover: string;
  opinion: string;
  body: string[];
  featured?: boolean;
  published?: boolean;
};
