/**
 * Utility for automatically removing solid/white backgrounds from school emblems
 * and converting them to clean transparent PNGs.
 * Uses edge-based flood fill with color distance matching and soft feathering.
 */

export interface TransparencyOptions {
  tolerance?: number; // 10 to 80 (default: 40)
  feather?: number; // feather edge pixels (default: 12)
  maxDimension?: number; // max dimension to resize (default: 800)
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
  const { tolerance = 40, feather = 12, maxDimension = 800 } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const handleImageLoaded = () => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (!width || !height) {
        reject(new Error('유효하지 않은 이미지 크기입니다.'));
        return;
      }

      // Resize if too large for performance and storage
      if (Math.max(width, height) > maxDimension) {
        const ratio = maxDimension / Math.max(width, height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
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
        ((height - 1) * width) * 4, // bottom-left
        ((height - 1) * width + (width - 1)) * 4, // bottom-right
      ];

      const transparentCornerCount = cornerIndices.filter(
        (idx) => data[idx + 3] < 50
      ).length;

      if (transparentCornerCount >= 3) {
        // Already transparent
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
        [Math.floor(width / 2), 0],
        [Math.floor(width / 2), height - 1],
        [0, Math.floor(height / 2)],
        [width - 1, Math.floor(height / 2)],
      ];

      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let validSamples = 0;

      for (const [sx, sy] of samplePoints) {
        const idx = (sy * width + sx) * 4;
        sumR += data[idx];
        sumG += data[idx + 1];
        sumB += data[idx + 2];
        validSamples++;
      }

      const bgR = Math.round(sumR / validSamples);
      const bgG = Math.round(sumG / validSamples);
      const bgB = Math.round(sumB / validSamples);

      // Color distance function
      const colorDist = (r: number, g: number, b: number): number => {
        const dr = r - bgR;
        const dg = g - bgG;
        const db = b - bgB;
        // Euclidean RGB distance with slight brightness boost for white backgrounds
        return Math.sqrt(dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11);
      };

      // Also check if background is bright white
      const isWhiteBg = bgR > 235 && bgG > 235 && bgB > 235;

      const visited = new Uint8Array(width * height);
      // Queue for BFS flood fill
      const queue: number[] = [];

      // Enqueue all border pixels
      for (let x = 0; x < width; x++) {
        // top edge
        const idxTop = x;
        const pTop = x * 4;
        if (
          colorDist(data[pTop], data[pTop + 1], data[pTop + 2]) <= tolerance ||
          (isWhiteBg && data[pTop] > 235 && data[pTop + 1] > 235 && data[pTop + 2] > 235)
        ) {
          visited[idxTop] = 1;
          queue.push(idxTop);
        }

        // bottom edge
        const idxBottom = (height - 1) * width + x;
        const pBottom = idxBottom * 4;
        if (
          colorDist(data[pBottom], data[pBottom + 1], data[pBottom + 2]) <= tolerance ||
          (isWhiteBg && data[pBottom] > 235 && data[pBottom + 1] > 235 && data[pBottom + 2] > 235)
        ) {
          visited[idxBottom] = 1;
          queue.push(idxBottom);
        }
      }

      for (let y = 1; y < height - 1; y++) {
        // left edge
        const idxLeft = y * width;
        const pLeft = idxLeft * 4;
        if (
          colorDist(data[pLeft], data[pLeft + 1], data[pLeft + 2]) <= tolerance ||
          (isWhiteBg && data[pLeft] > 235 && data[pLeft + 1] > 235 && data[pLeft + 2] > 235)
        ) {
          visited[idxLeft] = 1;
          queue.push(idxLeft);
        }

        // right edge
        const idxRight = y * width + (width - 1);
        const pRight = idxRight * 4;
        if (
          colorDist(data[pRight], data[pRight + 1], data[pRight + 2]) <= tolerance ||
          (isWhiteBg && data[pRight] > 235 && data[pRight + 1] > 235 && data[pRight + 2] > 235)
        ) {
          visited[idxRight] = 1;
          queue.push(idxRight);
        }
      }

      let removedCount = 0;
      let head = 0;

      while (head < queue.length) {
        const curr = queue[head++];
        const cx = curr % width;
        const cy = Math.floor(curr / width);

        // Check 4-directional neighbors
        const neighbors = [
          [cx + 1, cy],
          [cx - 1, cy],
          [cx, cy + 1],
          [cx, cy - 1],
        ];

        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = ny * width + nx;
            if (!visited[nIdx]) {
              const p = nIdx * 4;
              const dist = colorDist(data[p], data[p + 1], data[p + 2]);
              const matchesWhite =
                isWhiteBg && data[p] > 230 && data[p + 1] > 230 && data[p + 2] > 230;

              if (dist <= tolerance || matchesWhite) {
                visited[nIdx] = 1;
                queue.push(nIdx);
              } else if (dist <= tolerance + feather) {
                // Soft edge / feather boundary
                visited[nIdx] = 2; // Marked as feather
              }
            }
          }
        }
      }

      // Apply transparency
      for (let i = 0; i < visited.length; i++) {
        const p = i * 4;
        if (visited[i] === 1) {
          // Fully transparent
          data[p + 3] = 0;
          removedCount++;
        } else if (visited[i] === 2) {
          // Soft edge feathering
          const dist = colorDist(data[p], data[p + 1], data[p + 2]);
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
      reject(new Error('이미지를 불러오는데 실패했습니다.'));
    };

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        reject(new Error('파일을 읽는데 실패했습니다.'));
      };
      reader.readAsDataURL(imageSource);
    }
  });
};
