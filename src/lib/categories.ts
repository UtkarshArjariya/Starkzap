export interface Category {
  name: string;
  emoji: string;
}

export const CATEGORIES: Category[] = [
  { name: "fitness", emoji: "\u{1F4AA}" },
  { name: "food", emoji: "\u{1F35C}" },
  { name: "social", emoji: "\u{1F91D}" },
  { name: "skills", emoji: "\u{1F3AF}" },
  { name: "gaming", emoji: "\u{1F3AE}" },
  { name: "creative", emoji: "\u{1F3A8}" },
  { name: "weird", emoji: "\u{1F300}" },
  { name: "finance", emoji: "\u{1F4B0}" },
];

const TAG_SUFFIX_RE = /\n\[tags:([^\]]*)\]$/;

export function extractTags(description: string): string[] {
  const match = TAG_SUFFIX_RE.exec(description);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

export function stripTags(description: string): string {
  return description.replace(TAG_SUFFIX_RE, "");
}

export function appendTags(description: string, tags: string[]): string {
  if (tags.length === 0) return description;
  return `${stripTags(description)}\n[tags:${tags.join(",")}]`;
}
