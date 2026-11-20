import slugify from "slugify";

export function toSlug(base: string): string {
  return slugify(base, { lower: true, strict: true, trim: true }) || "item";
}

export function generateSlug(base: string): string {
  const clean = toSlug(base);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${clean}-${suffix}`;
}
