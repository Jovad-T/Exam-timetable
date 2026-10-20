/**
 * Ultra-fast utility for automatically removing solid/white backgrounds from school emblems
 * and converting them to clean transparent PNGs.
 * Uses typed-array BFS flood fill at optimized emblem resolution (256px max) for sub-20ms processing.
 */

export interface TransparencyOptions {
  tolerance?: number; // 10 to 80 (default: 40)
  feather?: number; // feather edge pixels (default: 12)
  maxDimension?: number; // max dimension to resize (default: 256 for school emblem)
}

export interface TransparencyResult {
  dataUrl: string;
  width: number;
  height: number;
  isAlreadyTransparent: boolean;
  removedPixelCount: number;
}

export const makeImageBackgroundTransparent = (
  imageSource: string | File,
  options: TransparencyOptions = {}
): Promise<TransparencyResult> => {
  const { tolerance = 40, feather = 12, maxDimension = 256 } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    let objectUrlToRevoke: string | null = null;
    const cleanup = () => {
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
        objectUrlToRevoke = null;
      }
    };

    const handleImageLoaded = () => {
      cleanup();

      let width = img.naturalWidth || img.width || 200;
      let height = img.naturalHeight || img.height || 200;

      // Resize immediately to emblem display dimension (default 256px) for instant processing & compact payload
      if (Math.max(width, height) > maxDimension) {
        const ratio = maxDimension / Math.max(width, height);
        width = Math.max(1, Math.round(width * ratio));
        height = Math.max(1, Math.round(height * ratio));
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) {
        reject(new Error('Canvas 2D context를 생성할 수 없습니다.'));
        return;
      }

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;

      // Check if the image already has significant transparency at the corners
      const cornerIndices = [
        0, // top-left
        (width - 1) * 4, // top-right
        (height - 1) * width * 4, // bottom-left
        ((height - 1) * width + (width - 1)) * 4, // bottom-right
      ];

      const transparentCornerCount = cornerIndices.filter(
        (idx) => data[idx + 3] < 50
      ).length;

      if (transparentCornerCount >= 3) {
        resolve({
          dataUrl: canvas.toDataURL('image/png'),
          width,
          height,
          isAlreadyTransparent: true,
          removedPixelCount: 0,
        });
        return;
      }

      // Sample border pixels to detect dominant background color
      const samplePoints: [number, number][] = [
        [0, 0],
        [width - 1, 0],
        [0, height - 1],
        [width - 1, height - 1],
        [width >> 1, 0],
        [width >> 1, height - 1],
        [0, height >> 1],
        [width - 1, height >> 1],
      ];

      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let validSamples = 0;

      for (let i = 0; i < samplePoints.length; i++) {
        const [sx, sy] = samplePoints[i];
        const idx = (sy * width + sx) * 4;
        sumR += data[idx];
        sumG += data[idx + 1];
        sumB += data[idx + 2];
        validSamples++;
      }

      const bgR = Math.round(sumR / validSamples);
      const bgG = Math.round(sumG / validSamples);
      const bgB = Math.round(sumB / validSamples);

      // Squared weighted color distance to avoid Math.sqrt inside tight pixel loop
      const tolSq = tolerance * tolerance;
      const featherEdge = tolerance + feather;
      const featherSq = featherEdge * featherEdge;

      const colorDistSq = (r: number, g: number, b: number): number => {
        const dr = r - bgR;
        const dg = g - bgG;
        const db = b - bgB;
        return dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
      };

      const isWhiteBg = bgR > 235 && bgG > 235 && bgB > 235;
      const totalPixels = width * height;
      const visited = new Uint8Array(totalPixels);
      const queue = new Int32Array(totalPixels);
      let head = 0;
      let tail = 0;

      const tryEnqueueBorder = (pixelIdx: number) => {
        if (visited[pixelIdx]) return;
        const p = pixelIdx << 2;
        const r = data[p];
        const g = data[p + 1];
        const b = data[p + 2];
        if (
          colorDistSq(r, g, b) <= tolSq ||
          (isWhiteBg && r > 235 && g > 235 && b > 235)
        ) {
          visited[pixelIdx] = 1;
          queue[tail++] = pixelIdx;
        }
      };

      // Enqueue border pixels
      for (let x = 0; x < width; x++) {
        tryEnqueueBorder(x);
        tryEnqueueBorder((height - 1) * width + x);
      }
      for (let y = 1; y < height - 1; y++) {
        tryEnqueueBorder(y * width);
        tryEnqueueBorder(y * width + (width - 1));
      }

      // Fast 4-way BFS using flat Int32Array queue (zero array allocation inside loop)
      while (head < tail) {
        const curr = queue[head++];
        const cx = curr % width;
        const cy = (curr / width) | 0;

        // Right
        if (cx + 1 < width) {
          const nIdx = curr + 1;
          if (!visited[nIdx]) {
            const p = nIdx << 2;
            const r = data[p], g = data[p + 1], b = data[p + 2];
            const distSq = colorDistSq(r, g, b);
            if (distSq <= tolSq || (isWhiteBg && r > 230 && g > 230 && b > 230)) {
              visited[nIdx] = 1;
              queue[tail++] = nIdx;
            } else if (distSq <= featherSq) {
              visited[nIdx] = 2;
            }
          }
        }
        // Left
        if (cx - 1 >= 0) {
          const nIdx = curr - 1;
          if (!visited[nIdx]) {
            const p = nIdx << 2;
            const r = data[p], g = data[p + 1], b = data[p + 2];
            const distSq = colorDistSq(r, g, b);
            if (distSq <= tolSq || (isWhiteBg && r > 230 && g > 230 && b > 230)) {
              visited[nIdx] = 1;
              queue[tail++] = nIdx;
            } else if (distSq <= featherSq) {
              visited[nIdx] = 2;
            }
          }
        }
        // Down
        if (cy + 1 < height) {
          const nIdx = curr + width;
          if (!visited[nIdx]) {
            const p = nIdx << 2;
            const r = data[p], g = data[p + 1], b = data[p + 2];
            const distSq = colorDistSq(r, g, b);
            if (distSq <= tolSq || (isWhiteBg && r > 230 && g > 230 && b > 230)) {
              visited[nIdx] = 1;
              queue[tail++] = nIdx;
            } else if (distSq <= featherSq) {
              visited[nIdx] = 2;
            }
          }
        }
        // Up
        if (cy - 1 >= 0) {
          const nIdx = curr - width;
          if (!visited[nIdx]) {
            const p = nIdx << 2;
            const r = data[p], g = data[p + 1], b = data[p + 2];
            const distSq = colorDistSq(r, g, b);
            if (distSq <= tolSq || (isWhiteBg && r > 230 && g > 230 && b > 230)) {
              visited[nIdx] = 1;
              queue[tail++] = nIdx;
            } else if (distSq <= featherSq) {
              visited[nIdx] = 2;
            }
          }
        }
      }

      let removedCount = 0;

      // Apply alpha channel updates
      for (let i = 0; i < totalPixels; i++) {
        const state = visited[i];
        if (state === 1) {
          data[(i << 2) + 3] = 0;
          removedCount++;
        } else if (state === 2) {
          const p = i << 2;
          const dist = Math.sqrt(colorDistSq(data[p], data[p + 1], data[p + 2]));
          const alphaRatio = Math.max(0, Math.min(1, (dist - tolerance) / feather));
          data[p + 3] = Math.round(data[p + 3] * alphaRatio);
          removedCount++;
        }
      }

      ctx.putImageData(imgData, 0, 0);

      resolve({
        dataUrl: canvas.toDataURL('image/png'),
        width,
        height,
        isAlreadyTransparent: false,
        removedPixelCount: removedCount,
      });
    };

    img.onerror = () => {
      cleanup();
      reject(new Error('이미지를 불러오는데 실패했습니다.'));
    };

    // Timeout safety guard (1.5s max)
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error('이미지 로드 시간이 초과되었습니다.'));
    }, 1500);

    const originalOnLoad = handleImageLoaded;
    img.onload = () => {
      window.clearTimeout(timeoutId);
      originalOnLoad();
    };

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      // Use URL.createObjectURL instead of FileReader for zero-copy instant loading
      objectUrlToRevoke = URL.createObjectURL(imageSource);
      img.src = objectUrlToRevoke;
    }
  });
};
