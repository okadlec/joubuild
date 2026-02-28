'use client';

import { useEffect, useRef, useState } from 'react';
import { Maximize2, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Photo360ViewerProps {
  imageUrl: string;
  width?: number;
  height?: number;
}

export function Photo360Viewer({ imageUrl, width = 800, height = 500 }: Photo360ViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    if (!loaded || !imageRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;

    // Map rotation to image offset for equirectangular projection
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;

    // Horizontal offset based on y-rotation
    const xOffset = ((rotation.y % 360 + 360) % 360 / 360) * imgWidth;
    // Vertical offset based on x-rotation (clamped)
    const yOffset = Math.max(0, Math.min(imgHeight - height, (imgHeight / 2) + (rotation.x / 90) * (imgHeight / 2) - height / 2));

    ctx.clearRect(0, 0, width, height);

    // Draw the visible portion with wrapping
    const srcX = Math.floor(xOffset);
    const srcW = Math.min(width, imgWidth - srcX);

    // Proportional mapping
    const scaleX = imgWidth / width;
    const scaleY = imgHeight / height;

    ctx.drawImage(
      img,
      srcX, yOffset, Math.min(imgWidth - srcX, width * scaleX), height * scaleY,
      0, 0, Math.min(width, (imgWidth - srcX) / scaleX), height
    );

    // Wrap around
    if (srcW < width * scaleX) {
      const remaining = width - srcW / scaleX;
      ctx.drawImage(
        img,
        0, yOffset, remaining * scaleX, height * scaleY,
        srcW / scaleX, 0, remaining, height
      );
    }
  }, [loaded, rotation, width, height]);

  function handleMouseDown(e: React.MouseEvent) {
    setIsDragging(true);
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging) return;
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };

    setRotation(prev => ({
      x: Math.max(-90, Math.min(90, prev.x - dy * 0.3)),
      y: prev.y - dx * 0.3,
    }));
  }

  function handleMouseUp() {
    setIsDragging(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setRotation({ x: 0, y: 0 })}>
          <RotateCw className="mr-1 h-3.5 w-3.5" />
          Reset
        </Button>
        <span className="text-xs text-muted-foreground">
          Tažením myší se rozhlížejte
        </span>
      </div>
      <div
        className="overflow-hidden rounded-lg border"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        {!loaded && (
          <div className="flex items-center justify-center" style={{ width, height }}>
            <p className="text-muted-foreground">Načítání 360° fotky...</p>
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ display: loaded ? 'block' : 'none' }}
        />
      </div>
    </div>
  );
}
