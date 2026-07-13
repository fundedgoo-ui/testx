import React, { useState, useEffect } from 'react';

export default function Logo({ className = "", textClassName = "text-lg" }: { className?: string, textClassName?: string }) {
  const [imgError, setImgError] = useState(false);
  const [processedSrc, setProcessedSrc] = useState<string | null>(null);

  useEffect(() => {
    setImgError(false);
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = "/logo.png?v=4";

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setProcessedSrc("/logo.png?v=4");
          return;
        }

        const width = img.naturalWidth;
        const height = img.naturalHeight;
        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        // Bounding box bounds of non-white content
        let minX = width;
        let minY = height;
        let maxX = 0;
        let maxY = 0;

        // Convert white/near-white pixels to transparent & find content bounds
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            const a = data[index + 3];

            // A pixel is considered white/near-white background if it meets these conditions:
            const isWhite = r > 230 && g > 230 && b > 230;

            if (isWhite) {
              data[index + 3] = 0; // Set alpha to 0 (make transparent)
            } else if (a > 10) {
              // Valid solid content pixel
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);

        // Crop to content bounding box to auto-trim huge empty margins
        if (maxX >= minX && maxY >= minY) {
          const padding = 6; // Add a tiny safety margin around cropped text
          const cropX = Math.max(0, minX - padding);
          const cropY = Math.max(0, minY - padding);
          const cropW = Math.min(width - cropX, (maxX - minX) + 2 * padding);
          const cropH = Math.min(height - cropY, (maxY - minY) + 2 * padding);

          const cropCanvas = document.createElement('canvas');
          cropCanvas.width = cropW;
          cropCanvas.height = cropH;
          const cropCtx = cropCanvas.getContext('2d');

          if (cropCtx) {
            cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
            setProcessedSrc(cropCanvas.toDataURL('image/png'));
          } else {
            setProcessedSrc(canvas.toDataURL('image/png'));
          }
        } else {
          setProcessedSrc(canvas.toDataURL('image/png'));
        }
      } catch (err) {
        console.error("Logo processing failed, using raw fallback:", err);
        setProcessedSrc("/logo.png?v=4");
      }
    };

    img.onerror = () => {
      setImgError(true);
    };
  }, []);

  // Parse height based on textClassName to match proportions
  let logoHeight = "h-8 sm:h-9";
  if (textClassName.includes("text-4xl")) {
    logoHeight = "h-16 sm:h-20 md:h-24";
  } else if (textClassName.includes("text-3xl")) {
    logoHeight = "h-12 sm:h-14 md:h-16";
  } else if (textClassName.includes("text-xl")) {
    logoHeight = "h-10 sm:h-11";
  } else if (textClassName.includes("text-lg")) {
    logoHeight = "h-8 sm:h-9";
  } else if (textClassName.includes("text-xs")) {
    logoHeight = "h-5";
  }

  return (
    <div className={`flex items-center select-none ${className}`}>
      {!imgError ? (
        <img 
          src={processedSrc || "/logo.png?v=4"} 
          alt="FundedGoo Logo"
          onError={() => setImgError(true)}
          className={`${logoHeight} w-auto object-contain transition-all duration-300 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]`}
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className={`font-sans font-black tracking-tight ${textClassName} flex items-center leading-none`}>
          {/* GOLD METALLIC "FUNDED" */}
          <span 
            className="bg-gradient-to-b from-[#FFF1C5] via-[#ECC35C] to-[#9E731F] bg-clip-text text-transparent drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.8)] filter brightness-110"
            style={{ letterSpacing: '-0.025em' }}
          >
            FUNDED
          </span>
          
          {/* BLUE METALLIC "G" */}
          <span 
            className="bg-gradient-to-b from-[#D4F7FF] via-[#00D4FF] to-[#0055FF] bg-clip-text text-transparent ml-1 drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.7)]"
            style={{ letterSpacing: '-0.025em' }}
          >
            G
          </span>

          {/* BLUE GLOSSY INFINITY LOOP "OO" */}
          <span className="inline-flex items-center ml-0.5" style={{ height: '0.85em', width: 'auto' }}>
            <svg
              viewBox="0 0 36 18"
              className="h-full w-auto"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ verticalAlign: 'middle', display: 'inline-block' }}
            >
              <defs>
                {/* Primary 3D Blue Metallic Gradient */}
                <linearGradient id="logoBlue" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#D4F7FF" />
                  <stop offset="25%" stopColor="#00F4FF" />
                  <stop offset="65%" stopColor="#007CFF" />
                  <stop offset="100%" stopColor="#003BC3" />
                </linearGradient>
                
                {/* Reflective Gloss Light Highlight */}
                <linearGradient id="logoHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                </linearGradient>

                {/* Accent Neon cyan glow */}
                <linearGradient id="logoAccent" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00F4FF" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
                </linearGradient>
              </defs>
              
              {/* Outline 3D Dark Stroke Background shadow */}
              <path
                d="M 10 13.5 C 7.5 13.5, 5.5 11.5, 5.5 9 C 5.5 6.5, 7.5 4.5, 10 4.5 C 12.5 4.5, 14.5 6.5, 16.5 9 C 18.5 11.5, 20.5 13.5, 23 13.5 C 25.5 13.5, 27.5 11.5, 27.5 9 C 27.5 6.5, 25.5 4.5, 23 4.5 C 20.5 4.5, 18.5 6.5, 16.5 9 C 14.5 11.5, 12.5 13.5, 10 13.5 Z"
                stroke="#060F1E"
                strokeWidth="4.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* Main Base Ribbon (Brilliant Gold/Blue Gradient) */}
              <path
                d="M 10 13.5 C 7.5 13.5, 5.5 11.5, 5.5 9 C 5.5 6.5, 7.5 4.5, 10 4.5 C 12.5 4.5, 14.5 6.5, 16.5 9 C 18.5 11.5, 20.5 13.5, 23 13.5 C 25.5 13.5, 27.5 11.5, 27.5 9 C 27.5 6.5, 25.5 4.5, 23 4.5 C 20.5 4.5, 18.5 6.5, 16.5 9 C 14.5 11.5, 12.5 13.5, 10 13.5 Z"
                stroke="url(#logoBlue)"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* Front Neon Cyan Glow Overlap Accent to add glossy volume */}
              <path
                d="M 10 13.5 C 7.5 13.5, 5.5 11.5, 5.5 9 C 5.5 6.5, 7.5 4.5, 10 4.5 C 12.5 4.5, 14.5 6.5, 16.5 9"
                stroke="url(#logoAccent)"
                strokeWidth="1.8"
                strokeLinecap="round"
                opacity="0.6"
              />
              
              {/* Highlighting sheen on Left Loop */}
              <path
                d="M 10 12 C 8 12, 7.2 11.2, 7.2 9 C 7.2 6.8, 8 6, 10 6"
                stroke="url(#logoHighlight)"
                strokeWidth="0.8"
                strokeLinecap="round"
                opacity="0.8"
              />
              
              {/* Highlighting sheen on Right Loop */}
              <path
                d="M 23 12 C 21 12, 20.2 11.2, 20.2 9 C 20.2 6.8, 21 6, 23 6"
                stroke="url(#logoHighlight)"
                strokeWidth="0.8"
                strokeLinecap="round"
                opacity="0.8"
              />
            </svg>
          </span>
        </span>
      )}
    </div>
  );
}
