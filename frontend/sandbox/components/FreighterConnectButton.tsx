"use client";
import { useEffect, useState } from "react";

declare global {
  interface Window {
    freighterApi?: {
      getPublicKey: () => Promise<string>;
    };
    freighter?: unknown;
  }
}

const FREIGHTER_URL = "https://www.freighter.app/";
const LS_KEY = "freighter_pubkey";

function truncate(key: string) {
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

export default function FreighterConnectButton() {
  const [pubkey, setPubkey] = useState<string | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) setPubkey(stored);
    setInstalled(typeof window !== "undefined" && !!(window.freighterApi || window.freighter));
  }, []);

  async function connect() {
    try {
      if (!window.freighterApi?.getPublicKey) {
        throw new Error("Freighter API not available");
      }

      const key = await window.freighterApi.getPublicKey();
      localStorage.setItem(LS_KEY, key);
      setPubkey(key);
    } catch (e) {
      console.error("Freighter connect failed", e);
    }
  }

  function disconnect() {
    localStorage.removeItem(LS_KEY);
    setPubkey(null);
  }

  if (!installed) {
    return (
      <a
        href={FREIGHTER_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
      >
        Install Freighter
      </a>
    );
  }

  return pubkey ? (
    <div className="flex items-center gap-3">
      <span className="text-sm font-mono bg-gray-100 px-3 py-1 rounded">{truncate(pubkey)}</span>
      <button onClick={disconnect} className="px-3 py-1 text-sm rounded border border-red-400 text-red-500 hover:bg-red-50">
        Disconnect
      </button>
    </div>
  ) : (
    <button onClick={connect} className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">
      Connect Wallet
    </button>
  );
}
