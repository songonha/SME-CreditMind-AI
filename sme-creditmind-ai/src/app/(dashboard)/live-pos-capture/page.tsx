"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, ImagePlus, RefreshCw, Trash2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  POS_CAPTURES_STORAGE_KEY,
  type PosCaptureRecord,
  generatePosCaptureFileName,
  getCaptureFileName,
  loadPosCapturesFromStorage,
} from "@/lib/pos-captures";

function newCaptureId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `cap-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export default function LivePosCapturePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [captures, setCaptures] = useState<PosCaptureRecord[]>([]);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isOpeningCamera, setIsOpeningCamera] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setCaptures(loadPosCapturesFromStorage());
    } catch {
      setStorageError("Could not read saved captures from this browser.");
    }
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const persistCaptures = useCallback((next: PosCaptureRecord[]) => {
    try {
      window.localStorage.setItem(POS_CAPTURES_STORAGE_KEY, JSON.stringify(next));
      setCaptures(next);
      setStorageError(null);
    } catch {
      setStorageError(
        "Storage is full or unavailable. Try clearing old captures or free browser storage."
      );
    }
  }, []);

  const startCamera = useCallback(async () => {
    setIsOpeningCamera(true);
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 720 },
          height: { ideal: 1280 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch {
      setCameraReady(false);
      setCameraError(
        "Could not access the camera. Please allow camera permission and try again."
      );
    } finally {
      setIsOpeningCamera(false);
    }
  }, []);

  const saveCapture = useCallback((base64Data: string, mimeType = "image/png") => {
    const newCapture: PosCaptureRecord = {
      id: newCaptureId(),
      createdAt: new Date().toISOString(),
      mimeType,
      base64Data,
      fileName: generatePosCaptureFileName(mimeType),
    };
    setCaptures((prev) => {
      try {
        const next = [newCapture, ...prev];
        window.localStorage.setItem(POS_CAPTURES_STORAGE_KEY, JSON.stringify(next));
        setStorageError(null);
        return next;
      } catch {
        setStorageError(
          "Could not save: storage may be full. Clear some captures and try again."
        );
        return prev;
      }
    });
  }, []);

  const captureFromCamera = useCallback(() => {
    const video = videoRef.current;
    if (!video || !cameraReady) {
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 1280;
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/png");
    const [, base64Data] = dataUrl.split(",");
    if (base64Data) {
      saveCapture(base64Data, "image/png");
    }
  }, [cameraReady, saveCapture]);

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const [prefix, base64Data] = result.split(",");
        if (!base64Data) {
          return;
        }
        const mimeType =
          prefix?.match(/data:(.*);base64/)?.[1] ?? file.type ?? "image/png";
        saveCapture(base64Data, mimeType);
      };
      reader.readAsDataURL(file);
      event.target.value = "";
    },
    [saveCapture]
  );

  const clearAllCaptures = useCallback(() => {
    persistCaptures([]);
  }, [persistCaptures]);

  const statusLine = useMemo(() => {
    if (captures.length === 0) {
      return "No POS captures saved yet. Images stay in this browser only (localStorage).";
    }
    return `${captures.length} capture${captures.length === 1 ? "" : "s"} saved locally for credit assessment workflows.`;
  }, [captures.length]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Live POS Capture</h1>
        <p className="text-muted-foreground max-w-3xl">
          Point your camera at a POS terminal, printed receipt, or settlement summary to
          capture transaction evidence in real time. Uploads and camera shots are stored
          only on this device and can support merchant onboarding and assessment reviews.
        </p>
        {storageError ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {storageError}
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Camera</CardTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Preview is portrait (9:16). Use the rear camera when possible for clearer receipts
              and terminal screens.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <div className="relative w-full max-w-[min(100%,360px)] overflow-hidden rounded-lg border bg-black/90 aspect-[9/16] max-h-[min(85vh,720px)]">
                <video
                  ref={videoRef}
                  className="absolute inset-0 h-full w-full object-cover"
                  muted
                  playsInline
                />
              </div>
            </div>

            {cameraError ? (
              <p className="text-sm text-destructive">{cameraError}</p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button onClick={startCamera} disabled={isOpeningCamera}>
                <Camera className="mr-2 h-4 w-4" />
                {isOpeningCamera
                  ? "Starting camera…"
                  : cameraReady
                    ? "Restart camera"
                    : "Start camera"}
              </Button>
              <Button
                variant="outline"
                onClick={captureFromCamera}
                disabled={!cameraReady}
              >
                <Save className="mr-2 h-4 w-4" />
                Capture & save
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus className="mr-2 h-4 w-4" />
                Upload image
              </Button>
              <Button variant="ghost" onClick={startCamera}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh feed
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Saved captures</CardTitle>
              <p className="text-xs text-muted-foreground font-normal mt-1">
                File names below are listed for use in{" "}
                <span className="font-medium text-foreground">New Assessment</span>. Storage key:{" "}
                <span className="font-mono">creditmind-assets</span>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllCaptures}
              disabled={captures.length === 0}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Clear all
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{statusLine}</p>
            {captures.length > 0 ? (
              <div className="rounded-lg border bg-muted/30 px-3 py-2">
                <p className="text-xs font-medium text-foreground mb-2">File names</p>
                <ol className="list-decimal list-inside space-y-1 text-xs font-mono text-muted-foreground max-h-32 overflow-y-auto">
                  {captures.map((item) => (
                    <li key={item.id} title={item.id}>
                      {getCaptureFileName(item)}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
            <div className="grid max-h-[420px] gap-3 overflow-auto pr-1">
              {captures.map((item) => (
                <div key={item.id} className="overflow-hidden rounded-lg border">
                  {/* eslint-disable-next-line @next/next/no-img-element -- data URL from localStorage */}
                  <img
                    src={`data:${item.mimeType};base64,${item.base64Data}`}
                    alt={getCaptureFileName(item)}
                    className="aspect-[9/16] w-full max-h-64 object-cover"
                  />
                  <div className="border-t bg-muted/40 px-3 py-2 space-y-1">
                    <p className="text-xs font-mono text-foreground break-all">
                      {getCaptureFileName(item)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
