"use client";

import { useEffect, useState } from "react";
import { shortAddress } from "@/lib/config";
import { resolveAddress } from "@/lib/starknetId";

export function useStarknetName(address: string | undefined): string {
  const [name, setName] = useState<string>(address ? shortAddress(address) : "");

  useEffect(() => {
    if (!address) return;
    setName(shortAddress(address));
    void resolveAddress(address).then(setName);
  }, [address]);

  return name;
}
