"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { PDFDocument } from "pdf-lib";

//pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DocumentRedactorProps {
  file: File;
  onReady: (redactedPdfBase64: string) => void;
  onCancel: () => void;
}

export default function DocumentRedactor({ file, onReady, onCancel }: DocumentRedactorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [rects, setRects] = useState<Rect[][]>([]);
  const [drawing, setDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [preview, setPreview] = useState<Rect | null>(null);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [skipModal, setSkipModal] = useState(false);

  // Render document to pages[]
  useEffect(() => {
    let cancelled = false;
    async function loadFile() {
      setLoading(true);
      const arrayBuffer = await file.arrayBuffer();

      if (file.type === "application/pdf") {
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pageDataUrls: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d")!;
          await page.render({ canvasContext: ctx, viewport }).promise;
          pageDataUrls.push(canvas.toDataURL("image/png"));
        }
        if (!cancelled) {
          setPages(pageDataUrls);
          setRects(pageDataUrls.map(() => []));
        }
      } else {
        // JPEG or PNG: single page
        const blob = new Blob([arrayBuffer], { type: file.type });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);
          if (!cancelled) {
            const dataUrl = canvas.toDataURL("image/png");
            setPages([dataUrl]);
            setRects([[]] );
          }
        };
        img.src = url;
      }
      if (!cancelled) setLoading(false);
    }
    loadFile();
    return () => { cancelled = true; };
  }, [file]);

  // Draw current page + rects onto canvas
  useEffect(() => {
    if (!pages[currentPage] || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      (rects[currentPage] ?? []).forEach((r) => {
        ctx.fillStyle = "black";
        ctx.fillRect(r.x, r.y, r.width, r.height);
      });
      if (preview) {
        ctx.fillStyle = "rgba(220,0,0,0.4)";
        ctx.fillRect(preview.x, preview.y, preview.width, preview.height);
      }
    };
    img.src = pages[currentPage];
  }, [pages, currentPage, rects, preview]);

  function getCanvasCoords(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let clientX: number, clientY: number;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  function onMouseDown(e: React.MouseEvent) {
    const pt = getCanvasCoords(e);
    setDrawing(true);
    setStartPoint(pt);
    setPreview({ x: pt.x, y: pt.y, width: 0, height: 0 });
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!drawing || !startPoint) return;
    const pt = getCanvasCoords(e);
    setPreview({
      x: Math.min(pt.x, startPoint.x),
      y: Math.min(pt.y, startPoint.y),
      width: Math.abs(pt.x - startPoint.x),
      height: Math.abs(pt.y - startPoint.y),
    });
  }

  function onMouseUp(e: React.MouseEvent) {
    if (!drawing || !startPoint) return;
    const pt = getCanvasCoords(e);
    const r: Rect = {
      x: Math.min(pt.x, startPoint.x),
      y: Math.min(pt.y, startPoint.y),
      width: Math.abs(pt.x - startPoint.x),
      height: Math.abs(pt.y - startPoint.y),
    };
    if (r.width > 4 && r.height > 4) {
      setRects((prev) => {
        const next = prev.map((arr) => [...arr]);
        next[currentPage] = [...(next[currentPage] ?? []), r];
        return next;
      });
    }
    setDrawing(false);
    setStartPoint(null);
    setPreview(null);
  }

  const touchCountRef = useRef(0);

  function onTouchStart(e: React.TouchEvent) {
    touchCountRef.current = e.touches.length;
    if (e.touches.length > 1) return; // pinch/zoom: let browser handle
    e.preventDefault();
    const pt = getCanvasCoords(e);
    setDrawing(true);
    setStartPoint(pt);
    setPreview({ x: pt.x, y: pt.y, width: 0, height: 0 });
  }

  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length > 1 || !drawing || !startPoint) return;
    e.preventDefault();
    const pt = getCanvasCoords(e);
    setPreview({
      x: Math.min(pt.x, startPoint.x),
      y: Math.min(pt.y, startPoint.y),
      width: Math.abs(pt.x - startPoint.x),
      height: Math.abs(pt.y - startPoint.y),
    });
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (!drawing || !startPoint || touchCountRef.current > 1) {
      setDrawing(false);
      setStartPoint(null);
      setPreview(null);
      return;
    }
    e.preventDefault();
    const changedTouch = e.changedTouches[0];
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const pt = {
      x: (changedTouch.clientX - rect.left) * scaleX,
      y: (changedTouch.clientY - rect.top) * scaleY,
    };
    const r: Rect = {
      x: Math.min(pt.x, startPoint.x),
      y: Math.min(pt.y, startPoint.y),
      width: Math.abs(pt.x - startPoint.x),
      height: Math.abs(pt.y - startPoint.y),
    };
    if (r.width > 4 && r.height > 4) {
      setRects((prev) => {
        const next = prev.map((arr) => [...arr]);
        next[currentPage] = [...(next[currentPage] ?? []), r];
        return next;
      });
    }
    setDrawing(false);
    setStartPoint(null);
    setPreview(null);
  }

  function undoLast() {
    setRects((prev) => {
      const next = prev.map((arr) => [...arr]);
      next[currentPage] = next[currentPage].slice(0, -1);
      return next;
    });
  }

  const hasAnyRect = rects.some((arr) => arr.length > 0);

  function handleSkip() {
    if (!hasAnyRect) {
      setSkipModal(true);
    } else {
      handleSubmit();
    }
  }

  const handleSubmit = useCallback(async () => {
    setComposing(true);
    try {
      const pdfDoc = await PDFDocument.create();
      for (let i = 0; i < pages.length; i++) {
        const offscreen = document.createElement("canvas");
        const img = new Image();
        await new Promise<void>((res) => {
          img.onload = () => {
            offscreen.width = img.naturalWidth;
            offscreen.height = img.naturalHeight;
            const ctx = offscreen.getContext("2d")!;
            ctx.drawImage(img, 0, 0);
            (rects[i] ?? []).forEach((r) => {
              ctx.fillStyle = "black";
              ctx.fillRect(r.x, r.y, r.width, r.height);
            });
            res();
          };
          img.src = pages[i];
        });

        const pngBytes = await new Promise<Uint8Array>((res) => {
          offscreen.toBlob((blob) => {
            blob!.arrayBuffer().then((ab) => res(new Uint8Array(ab)));
          }, "image/png");
        });

        const pngImage = await pdfDoc.embedPng(pngBytes);
        const page = pdfDoc.addPage([pngImage.width, pngImage.height]);
        page.drawImage(pngImage, { x: 0, y: 0, width: pngImage.width, height: pngImage.height });
      }

      const pdfBytes = await pdfDoc.saveAsBase64();
      onReady(pdfBytes);
    } finally {
      setComposing(false);
    }
  }, [pages, rects, onReady]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-[#64748B]">Caricamento documento...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[#0F172A]">
          Pagina {currentPage + 1} di {pages.length}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="px-3 py-1 rounded border border-[#E2E8F0] text-sm disabled:opacity-40 hover:bg-[#F7F9FC]"
          >
            ‹
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(pages.length - 1, p + 1))}
            disabled={currentPage === pages.length - 1}
            className="px-3 py-1 rounded border border-[#E2E8F0] text-sm disabled:opacity-40 hover:bg-[#F7F9FC]"
          >
            ›
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative w-full overflow-hidden rounded-lg border border-[#E2E8F0] bg-[#F7F9FC]">
        <canvas
          ref={canvasRef}
          className="w-full h-auto block"
          style={{ cursor: "crosshair" }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={() => { setDrawing(false); setPreview(null); }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        />
      </div>

      <p className="text-xs text-[#64748B]">
        Trascina per oscurare le aree con dati personali (nome, codice fiscale, IBAN, ecc.)
      </p>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 justify-between">
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B] hover:bg-[#F7F9FC]"
          >
            Annulla
          </button>
          <button
            onClick={undoLast}
            disabled={(rects[currentPage]?.length ?? 0) === 0}
            className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm disabled:opacity-40 hover:bg-[#F7F9FC]"
          >
            Annulla ultimo
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSkip}
            className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B] hover:bg-[#F7F9FC]"
          >
            Salta
          </button>
          <button
            onClick={handleSubmit}
            disabled={composing}
            className="px-4 py-2 rounded-lg bg-[#1B4FD8] text-white text-sm font-medium hover:bg-[#1640B0] disabled:opacity-50"
          >
            {composing ? "Preparazione..." : "Invia →"}
          </button>
        </div>
      </div>

      {/* Skip confirmation modal */}
      {skipModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <p className="text-[#0F172A] font-medium">Nessuna area oscurata. Procedere?</p>
            <p className="text-sm text-[#64748B]">
              Il documento verrà inviato senza oscuramenti. I dati personali visibili saranno inclusi nell&apos;analisi.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setSkipModal(false)}
                className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm"
              >
                Torna indietro
              </button>
              <button
                onClick={() => { setSkipModal(false); handleSubmit(); }}
                className="px-4 py-2 rounded-lg bg-[#1B4FD8] text-white text-sm font-medium"
              >
                Procedi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
