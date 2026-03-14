import type { Dare, SerializedDare } from "@/lib/types";

export function serializeDare(dare: Dare): SerializedDare {
  return {
    ...dare,
    id: dare.id.toString(),
    rewardAmount: dare.rewardAmount.toString(),
  };
}
