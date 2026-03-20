import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Try to extract a human-readable felt252 short-string from a hex value
 * embedded in an error message (e.g. "0x446561646c696e6520746f6f20736f6f6e").
 */
function tryDecodeFeltString(hex: string): string | null {
  try {
    const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
    if (clean.length === 0 || clean.length > 62) return null;
    const bytes = clean.match(/.{1,2}/g);
    if (!bytes) return null;
    const text = bytes.map((b) => String.fromCharCode(parseInt(b, 16))).join("");
    // Only return if it looks like readable ASCII
    if (/^[\x20-\x7e]+$/.test(text)) return text;
    return null;
  } catch {
    return null;
  }
}

export function decodeContractError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  const raw = message.toLowerCase();

  if (/user.*rejected|user.*cancel|user.*denied|refused/i.test(raw))
    return "Transaction cancelled.";
  if (/insufficient.*balance|balance.*insufficient/i.test(raw))
    return "Insufficient balance. Top up your STRK or ETH.";
  if (/insufficient.*allowance|allowance/i.test(raw))
    return "Token allowance too low. Make sure the approve step went through.";
  if (/deadline.*too.*soon|too_soon/i.test(raw))
    return "Deadline must be at least 1 hour from now.";
  if (/dare not open|not_open|already.*claimed/i.test(raw))
    return "This dare has already been claimed.";
  if (/not.*claimer|not_claimer/i.test(raw))
    return "Only the claimer can submit proof.";
  if (/voting.*closed|window.*ended|not in voting|not_voting/i.test(raw))
    return "The voting window is closed for this dare.";
  if (/already.*voted|already_voted/i.test(raw))
    return "You have already voted on this dare.";
  if (/poster.*cannot|cannot.*poster/i.test(raw))
    return "The poster cannot perform this action.";
  if (/claimer.*cannot|cannot.*claimer/i.test(raw))
    return "The claimer cannot perform this action.";
  if (/cannot finalize yet|finalize/i.test(raw))
    return "This dare cannot be finalized yet — wait for the deadline or vote window to close.";
  if (/reward must be|reward.*zero/i.test(raw))
    return "Reward amount must be greater than 0.";
  if (/class.*hash.*not.*declared|contract.*not.*found/i.test(raw))
    return "Contract not found. Please contact support.";
  if (/network|fetch|failed to fetch|connection/i.test(raw))
    return "Network error. Check your connection and try again.";
  if (/key.*ring|no accounts/i.test(raw))
    return "Your wallet has no accounts. Open the extension and create one first.";
  if (/execution.*rejected|execution_error.*rejected/i.test(raw))
    return "Transaction rejected — your wallet may not have enough tokens to cover the reward amount. Fund your wallet first.";

  // Try to extract a felt252 revert reason from hex values in the error
  const hexMatch = message.match(/0x[0-9a-fA-F]{4,62}/g);
  if (hexMatch) {
    for (const hex of hexMatch) {
      const decoded = tryDecodeFeltString(hex);
      if (decoded && decoded.length > 3) {
        return `Contract error: ${decoded}`;
      }
    }
  }

  // Try to find a quoted revert reason
  const quotedMatch = message.match(/['"]([^'"]{3,})['"]/) ??
    message.match(/Error:\s*(.{3,80})(?:\n|$)/);
  if (quotedMatch) {
    return `Transaction failed: ${quotedMatch[1].trim()}`;
  }

  // Show a truncated version of the raw error instead of hiding it
  const short = message.length > 200 ? `${message.slice(0, 200)}…` : message;
  return `Transaction failed: ${short}`;
}

