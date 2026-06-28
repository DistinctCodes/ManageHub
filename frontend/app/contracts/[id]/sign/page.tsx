"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckCircle, AlertCircle } from "lucide-react";
import api from "@/lib/axios";

type Contract = {
  id: string;
  title: string;
  bodyHtml: string;
  status: string;
  expiresAt?: string;
  signedAt?: string;
};

export default function SignContractPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSig, setHasSig] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const { data: contract, isLoading, error } = useQuery({
    queryKey: ["contract", id],
    queryFn: async () => {
      const r = await api.get(`/contracts/${id}`);
      return r.data.data as Contract;
    },
  });

  const signMutation = useMutation({
    mutationFn: (signatureData: string) =>
      api.patch(`/contracts/${id}/sign`, { signatureData }),
    onSuccess: () => router.push("/contracts/signed"),
  });

  const getCtx = () => canvasRef.current?.getContext("2d") ?? null;

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const ctx = getCtx();
    if (!ctx) return;
    setDrawing(true);
    const rect = canvasRef.current!.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const ctx = getCtx();
    if (!ctx) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1e293b";
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    setHasSig(true);
  };

  const stopDraw = () => setDrawing(false);

  const clearSig = () => {
    const ctx = getCtx();
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasSig(false);
  };

  const handleSign = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const signatureData = canvas.toDataURL("image/png");
    signMutation.mutate(signatureData);
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-400">Loading contract…</div>;
  }

  if (error || !contract) {
    return (
      <div className="p-8 text-center text-red-500 flex flex-col items-center gap-2">
        <AlertCircle size={32} />
        <p>Contract not found or access denied.</p>
      </div>
    );
  }

  if (contract.status === "signed") {
    return (
      <div className="p-8 text-center flex flex-col items-center gap-3 text-green-600">
        <CheckCircle size={48} />
        <h2 className="text-xl font-semibold">Already Signed</h2>
        <p className="text-gray-500 text-sm">
          Signed on {new Date(contract.signedAt!).toLocaleDateString()}
        </p>
      </div>
    );
  }

  if (contract.status !== "sent") {
    return (
      <div className="p-8 text-center text-gray-500">
        This contract is not available for signing (status: {contract.status}).
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">{contract.title}</h1>
      {contract.expiresAt && (
        <p className="text-sm text-amber-600">
          Expires: {new Date(contract.expiresAt).toLocaleDateString()}
        </p>
      )}

      <div
        className="border rounded-xl p-6 bg-white prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: contract.bodyHtml }}
      />

      <div className="space-y-3">
        <h2 className="font-semibold">Your Signature</h2>
        <p className="text-xs text-gray-500">Draw your signature in the box below</p>
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={600}
            height={150}
            className="w-full border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 cursor-crosshair"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
          />
          {!hasSig && (
            <p className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm pointer-events-none">
              Sign here
            </p>
          )}
        </div>
        {hasSig && (
          <button
            onClick={clearSig}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Clear signature
          </button>
        )}
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 accent-indigo-600"
        />
        <span className="text-sm text-gray-700">
          I have read and agree to the terms of this contract and confirm this is my
          electronic signature.
        </span>
      </label>

      <button
        onClick={handleSign}
        disabled={!hasSig || !agreed || signMutation.isPending}
        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {signMutation.isPending ? "Signing…" : "Sign Contract"}
      </button>

      {signMutation.isError && (
        <p className="text-sm text-red-500 text-center">
          Failed to sign contract. Please try again.
        </p>
      )}
    </div>
  );
}
