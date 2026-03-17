export interface DareTemplate {
  emoji: string;
  title: string;
  description: string;
  category: string;
  suggestedRewardStrk: string;
  suggestedDays: number;
}

export const DARE_TEMPLATES: DareTemplate[] = [
  { emoji: "\u{1F336}\u{FE0F}", title: "Eat a ghost pepper", description: "Film eating a full ghost pepper. No milk for 60 seconds.", category: "food", suggestedRewardStrk: "1", suggestedDays: 7 },
  { emoji: "\u{1F3C3}", title: "Run 5km non-stop", description: "Run 5 continuous km. Share GPS screenshot as proof.", category: "fitness", suggestedRewardStrk: "2", suggestedDays: 14 },
  { emoji: "\u{1F4AA}", title: "100 pushups in one session", description: "100 consecutive pushups filmed start to finish.", category: "fitness", suggestedRewardStrk: "0.5", suggestedDays: 3 },
  { emoji: "\u{1F4F5}", title: "No social media for 7 days", description: "No Instagram, X, TikTok for 7 days. Share what you learned.", category: "social", suggestedRewardStrk: "2", suggestedDays: 7 },
  { emoji: "\u{1F9CA}", title: "Cold shower every day", description: "Cold shower daily for 7 days. Film the last one.", category: "fitness", suggestedRewardStrk: "1", suggestedDays: 7 },
  { emoji: "\u{1F9E9}", title: "Solve a Rubik's cube", description: "Learn and film solving a Rubik's cube from scratch.", category: "skills", suggestedRewardStrk: "3", suggestedDays: 30 },
];
