'use client';

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react';

export interface SideBooksReaderEngineRef {
  flipNext: () => void;
  flipPrev: () => void;
  goToPage: (pageNum: number) => void;
  toggleZoom?: () => void;
  zoomIn?: () => void;
  zoomOut?: () => void;
  resetZoom?: () => void;
  getZoomScale?: () => number;
}

export interface SideBooksReaderEngineProps {
  pageImages: string[];
  initialPage?: number;
  onPageChange?: (pageIdx: number) => void;
  onCenterClick?: () => void;
  readingTheme?: 'dark' | 'sepia' | 'ivory' | 'gray';
  readingMode?: 'curl' | 'roll' | 'scroll';
  className?: string;
}

/**
 * SideBooksReaderEngine:
 * - Hỗ trợ đầy đủ các chế độ đọc:
 *   1. CURL 3D (Lật sách góc 3D như thật chuẩn SideBooks - Tokyo Interplay Corp):
 *      - Uốn cong hình nón góc dưới/trên, vạt lật phản chiếu ảnh trang ngửa qua nếp gấp
 *      - Độ trong suốt giấy ngà, dải sáng phản chiếu uốn cong gân giấy (specular) và bóng đổ mềm mại
 *      - Khử hoàn toàn lỗi nháy kép (in/out continuous dampening)
 *   2. ROLL 3D (Vuốt cuộn 3D mượt mà - Chế độ vuốt riêng biệt theo yêu cầu người dùng)
 *   3. SCROLL (Cuộn dọc truyền thống)
 * - Tiếp tục chuyển động mượt mà từ vị trí ngón tay nhấc lên (không giật về 0)
 * - Mỗi trang là 1 trang đơn nguyên bản (Single Page Portrait)
 */
const SideBooksReaderEngine = forwardRef<SideBooksReaderEngineRef, SideBooksReaderEngineProps>(
  (
    {
      pageImages,
      initialPage = 0,
      onPageChange,
      onCenterClick,
      readingTheme = 'gray',
      readingMode = 'curl',
      className = '',
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [isReady, setIsReady] = useState<boolean>(false);
    const [currentPage, setCurrentPage] = useState<number>(initialPage);
    const totalPages = pageImages.length;

    // Cache các đối tượng ảnh đã nạp
    const imagesRef = useRef<HTMLImageElement[]>([]);
    const curIndexRef = useRef<number>(initialPage);
    curIndexRef.current = currentPage;

    // Trạng thái Thu Phóng (Zoom & Pan)
    const [zoomScale, setZoomScale] = useState<number>(1);
    const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const isPanningRef = useRef<boolean>(false);
    const lastTapTimeRef = useRef<number>(0);

    const onPageChangeRef = useRef(onPageChange);
    onPageChangeRef.current = onPageChange;

    const onCenterClickRef = useRef(onCenterClick);
    onCenterClickRef.current = onCenterClick;

    // Trạng thái hoạt họa và cử chỉ
    const isAnimatingRef = useRef<boolean>(false);
    const animReqRef = useRef<number | null>(null);

    // Lưu tiến trình kéo hiện tại để chuyển tiếp mượt mà khi thả tay
    const currentProgressRef = useRef<number>(0);

    // Kích thước logic của trang sách (CSS pixels)
    const bookSizeRef = useRef<{ width: number; height: number }>({ width: 340, height: 480 });

    // Trạng thái điều khiển cử chỉ chạm vuốt (Pointer Gesture State)
    const pointerStateRef = useRef<{
      isDown: boolean;
      startX: number;
      startY: number;
      startTime: number;
      lastX: number;
      lastY: number;
      mode: 'drag_next' | 'drag_prev' | null;
      hasMoved: boolean;
    }>({
      isDown: false,
      startX: 0,
      startY: 0,
      startTime: 0,
      lastX: 0,
      lastY: 0,
      mode: null,
      hasMoved: false,
    });

    // Lập lịch render frame khi vuốt ngón tay đồng bộ màn hình (V-Sync RAF Batching)
    const moveRafRef = useRef<number | null>(null);
    const pendingFrameRef = useRef<{ mode: 'next' | 'prev'; progress: number } | null>(null);

    // Hàm vẽ gáy sách bên trái (Left binding spine shadow)
    const drawSpineGutter = useCallback((ctx: CanvasRenderingContext2D, W: number, H: number) => {
      const gW = Math.max(12, W * 0.035);
      const g = ctx.createLinearGradient(0, 0, gW, 0);
      g.addColorStop(0, 'rgba(0, 0, 0, 0.42)');
      g.addColorStop(0.35, 'rgba(0, 0, 0, 0.16)');
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, gW, H);
    }, []);

    // Hàm vẽ trang tĩnh hoàn chỉnh
    const drawStaticPage = useCallback(
      (idx: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width: W, height: H } = bookSizeRef.current;
        ctx.clearRect(0, 0, W, H);

        const img = imagesRef.current[idx];
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, 0, 0, W, H);
          drawSpineGutter(ctx, W, H);
        } else {
          // Nền giấy màu kem trang nhã theo theme nếu ảnh đang nạp
          const paperTint =
            readingTheme === 'sepia'
              ? '#F4ECD8'
              : readingTheme === 'dark'
              ? '#1E232D'
              : '#FAF8F3';
          ctx.fillStyle = paperTint;
          ctx.fillRect(0, 0, W, H);
          drawSpineGutter(ctx, W, H);
        }
      },
      [readingTheme, drawSpineGutter]
    );

    // ================= 1. BỘ DỰNG CHẾ ĐỘ CURL 3D (LẬT SÁCH GÓC NHƯ THẬT) =================
    // Lật tiếp (NEXT): Góc dưới bên phải uốn cong hình nón, phản chiếu mặt sau trang sách
    const drawCurlNextFrame = useCallback(
      (progress: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width: W, height: H } = bookSizeRef.current;
        const curIdx = curIndexRef.current;
        const imgTop = imagesRef.current[curIdx];
        const imgBottom = imagesRef.current[Math.min(curIdx + 1, totalPages - 1)];

        const p = Math.max(0, Math.min(1, progress));
        if (p <= 0.001) {
          drawStaticPage(curIdx);
          return;
        }
        if (p >= 0.999) {
          ctx.clearRect(0, 0, W, H);
          if (imgBottom && imgBottom.complete) ctx.drawImage(imgBottom, 0, 0, W, H);
          drawSpineGutter(ctx, W, H);
          return;
        }

        // 1. Vẽ trang phẳng bên dưới (Page N+1)
        ctx.clearRect(0, 0, W, H);
        if (imgBottom && imgBottom.complete) {
          ctx.drawImage(imgBottom, 0, 0, W, H);
        }

        // 2. Tính toán tọa độ góc uốn hình nón (Conical Corner Coordinates)
        const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        const tx = W - ease * W * 1.88;
        const ty = H - Math.sin(ease * Math.PI) * H * 0.36;

        const cx = W, cy = H;
        const mx = (cx + tx) / 2;
        const my = (cy + ty) / 2;
        const dx = tx - cx;
        const dy = ty - cy;
        const len = Math.hypot(dx, dy);
        if (len < 1e-4) return;
        const nx = dx / len;
        const ny = dy / len;

        function reflect(x: number, y: number) {
          const d = (x - mx) * nx + (y - my) * ny;
          return { x: x - 2 * d * nx, y: y - 2 * d * ny };
        }

        let pBottom: { x: number; y: number } | null = null;
        let pRight: { x: number; y: number } | null = null;
        let pTop: { x: number; y: number } | null = null;
        let pLeft: { x: number; y: number } | null = null;

        if (Math.abs(nx) > 1e-5) {
          const bx = mx - ny * (H - my) / nx;
          if (bx >= 0 && bx <= W) pBottom = { x: bx, y: H };
        }
        if (Math.abs(ny) > 1e-5) {
          const ry = my - nx * (W - mx) / ny;
          if (ry >= 0 && ry <= H) pRight = { x: W, y: ry };
        }
        if (Math.abs(nx) > 1e-5) {
          const tx0 = mx - ny * (-my) / nx;
          if (tx0 >= 0 && tx0 <= W) pTop = { x: tx0, y: 0 };
        }
        if (Math.abs(ny) > 1e-5) {
          const ly = my - nx * (-mx) / ny;
          if (ly >= 0 && ly <= H) pLeft = { x: 0, y: ly };
        }

        const p1 = pBottom || (pLeft ? pLeft : { x: 0, y: H });
        const p2 = pTop || (pRight ? pRight : { x: W, y: 0 });

        // 3. Vẽ phần phẳng chưa lật của imgTop (Page N) bên trái nếp gấp
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        if (pTop) {
          ctx.lineTo(pTop.x, 0);
        } else {
          ctx.lineTo(W, 0);
          if (pRight) ctx.lineTo(W, pRight.y);
        }
        ctx.lineTo(p1.x, p1.y);
        if (pLeft && !pBottom) {
          ctx.lineTo(0, p1.y);
        } else {
          ctx.lineTo(0, H);
        }
        ctx.closePath();
        ctx.clip();
        if (imgTop && imgTop.complete) {
          ctx.drawImage(imgTop, 0, 0, W, H);
        }
        ctx.restore();

        // 4. Bóng đổ nếp uốn kép chiếu lên trang dưới (Dual Real-Paper Drop Shadows)
        const inFactor = Math.min(1, p / 0.08);
        const outFactor = Math.max(0, Math.min(1, (1 - p) / 0.1));

        // 4.1 Lớp 1: Bóng tiếp xúc nếp gập (Crease Occlusion Shadow - Ambient Contact)
        const sDist1 = Math.min(18, W * 0.05) * inFactor * outFactor;
        const sOpacity1 = 0.46 * inFactor * outFactor;
        if (sDist1 > 0.5 && sOpacity1 > 0.01) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineTo(p2.x + nx * sDist1, p2.y + ny * sDist1);
          ctx.lineTo(p1.x + nx * sDist1, p1.y + ny * sDist1);
          ctx.closePath();

          const sGrad1 = ctx.createLinearGradient(mx, my, mx + nx * sDist1, my + ny * sDist1);
          sGrad1.addColorStop(0, `rgba(0, 0, 0, ${sOpacity1})`);
          sGrad1.addColorStop(0.38, `rgba(0, 0, 0, ${sOpacity1 * 0.42})`);
          sGrad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = sGrad1;
          ctx.fill();
          ctx.restore();
        }

        // 4.2 Lớp 2: Bóng khuếch tán không gian mềm (Diffuse Ambient Soft Shadow)
        const sDist2 = Math.min(52, W * 0.15) * inFactor * outFactor;
        const sOpacity2 = 0.28 * inFactor * outFactor;
        if (sDist2 > 1 && sOpacity2 > 0.01) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineTo(p2.x + nx * sDist2, p2.y + ny * sDist2);
          ctx.lineTo(p1.x + nx * sDist2, p1.y + ny * sDist2);
          ctx.closePath();

          const sGrad2 = ctx.createLinearGradient(mx, my, mx + nx * sDist2, my + ny * sDist2);
          sGrad2.addColorStop(0, `rgba(0, 0, 0, ${sOpacity2})`);
          sGrad2.addColorStop(0.45, `rgba(0, 0, 0, ${sOpacity2 * 0.32})`);
          sGrad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = sGrad2;
          ctx.fill();
          ctx.restore();
        }

        // 5. Vạt lật uốn cong 3D (Curled Flap)
        const refTopRight = pTop ? reflect(W, 0) : null;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);

        const bow = 18 * inFactor * outFactor;
        ctx.quadraticCurveTo((p1.x + tx) / 2 + nx * bow, (p1.y + ty) / 2 + ny * bow, tx, ty);

        if (refTopRight) {
          ctx.quadraticCurveTo(
            (tx + refTopRight.x) / 2 + nx * bow,
            (ty + refTopRight.y) / 2 + ny * bow,
            refTopRight.x,
            refTopRight.y
          );
          ctx.quadraticCurveTo(
            (refTopRight.x + p2.x) / 2 + nx * bow,
            (refTopRight.y + p2.y) / 2 + ny * bow,
            p2.x,
            p2.y
          );
        } else {
          ctx.quadraticCurveTo((p2.x + tx) / 2 + nx * bow, (p2.y + ty) / 2 + ny * bow, p2.x, p2.y);
        }
        ctx.closePath();
        ctx.clip();

        // 5.1 Phản chiếu ảnh trang Top qua nếp gấp (Fold Reflection)
        if (imgTop && imgTop.complete) {
          ctx.save();
          const lineAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
          ctx.translate(p1.x, p1.y);
          ctx.rotate(lineAngle);
          ctx.scale(1, -1);
          ctx.rotate(-lineAngle);
          ctx.translate(-p1.x, -p1.y);
          ctx.drawImage(imgTop, 0, 0, W, H);
          ctx.restore();
        }

        // 5.2 Lớp nền giấy mờ ngà theo theme
        const paperTint =
          readingTheme === 'sepia'
            ? 'rgba(244, 236, 216, 0.88)'
            : readingTheme === 'dark'
            ? 'rgba(30, 35, 45, 0.88)'
            : 'rgba(250, 248, 243, 0.88)';
        ctx.fillStyle = paperTint;
        ctx.fill();

        // 5.3 Dải sáng 3D uốn cong gân giấy (Specular Crest & Real Paper Shading)
        const fGrad = ctx.createLinearGradient(mx, my, tx, ty);
        fGrad.addColorStop(0, 'rgba(215, 210, 200, 0.48)');
        fGrad.addColorStop(0.20, 'rgba(255, 255, 255, 0.94)'); // gân sáng phản xạ ánh sáng phòng
        fGrad.addColorStop(0.48, 'rgba(245, 240, 230, 0.28)');
        fGrad.addColorStop(0.82, 'rgba(195, 188, 175, 0.44)');
        fGrad.addColorStop(1, 'rgba(110, 105, 92, 0.62)');
        ctx.fillStyle = fGrad;
        ctx.fill();

        // 5.4 Mép giấy sắc nét mảnh tinh tế
        ctx.strokeStyle = `rgba(0, 0, 0, ${0.18 * inFactor * outFactor})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        ctx.restore();

        // 6. Gáy sách bên trái (Spine)
        drawSpineGutter(ctx, W, H);
      },
      [totalPages, readingTheme, drawSpineGutter, drawStaticPage]
    );

    // Lật lùi (PREV): Uốn cong góc 3D hình nón từ gáy sang phải (chuẩn SideBooks)
    const drawCurlPrevFrame = useCallback(
      (progress: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width: W, height: H } = bookSizeRef.current;
        const curIdx = curIndexRef.current;
        const imgUnder = imagesRef.current[curIdx]; // Page hiện tại (nằm phẳng bên dưới)
        const imgTop = imagesRef.current[Math.max(0, curIdx - 1)]; // Page trước (đang mở ra đè lên)

        const p = Math.max(0, Math.min(1, progress));
        if (p <= 0.001) {
          drawStaticPage(curIdx);
          return;
        }

        ctx.clearRect(0, 0, W, H);
        if (imgUnder && imgUnder.complete) {
          ctx.drawImage(imgUnder, 0, 0, W, H);
        }

        if (p >= 0.999) {
          if (imgTop && imgTop.complete) {
            ctx.drawImage(imgTop, 0, 0, W, H);
          }
          drawSpineGutter(ctx, W, H);
          return;
        }

        const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        const foldTopX = ease * W * 1.08;
        const foldBottomX = ease * W * 0.92;

        // 1. Vẽ phần phẳng của Page 1 (ở bên trái nếp gấp)
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(foldTopX, 0);
        ctx.lineTo(foldBottomX, H);
        ctx.lineTo(0, H);
        ctx.closePath();
        ctx.clip();
        if (imgTop && imgTop.complete) {
          ctx.drawImage(imgTop, 0, 0, W, H);
        }
        ctx.restore();

        const inFactor = Math.min(1, p / 0.08);
        const outFactor = Math.max(0, Math.min(1, (1 - p) / 0.1));

        // 2. Vạt lật cuốn 3D (Curled Flap) hướng sang phải
        const flapWidth = Math.min(65, W * 0.22) * inFactor * outFactor;
        const tx = foldBottomX + flapWidth * 1.35;
        const ty = H - Math.sin(ease * Math.PI) * H * 0.28;

        const p1x = foldBottomX, p1y = H;
        const p2x = foldTopX, p2y = 0;

        // 2. Bóng đổ nếp uốn kép chiếu sang phải lên Page dưới (Dual Drop Shadows)
        const sDist1 = Math.min(18, W * 0.05) * inFactor * outFactor;
        const sOpacity1 = 0.46 * inFactor * outFactor;
        if (sDist1 > 0.5 && sOpacity1 > 0.01) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(p1x, p1y);
          ctx.lineTo(p2x, p2y);
          ctx.lineTo(p2x + sDist1, p2y);
          ctx.lineTo(p1x + sDist1, p1y);
          ctx.closePath();
          const midX = (p1x + p2x) / 2;
          const sGrad1 = ctx.createLinearGradient(midX, 0, midX + sDist1, 0);
          sGrad1.addColorStop(0, `rgba(0, 0, 0, ${sOpacity1})`);
          sGrad1.addColorStop(0.38, `rgba(0, 0, 0, ${sOpacity1 * 0.42})`);
          sGrad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = sGrad1;
          ctx.fill();
          ctx.restore();
        }

        const sDist2 = Math.min(50, W * 0.15) * inFactor * outFactor;
        const sOpacity2 = 0.28 * inFactor * outFactor;
        if (sDist2 > 1 && sOpacity2 > 0.01) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(p1x, p1y);
          ctx.lineTo(p2x, p2y);
          ctx.lineTo(p2x + sDist2, p2y);
          ctx.lineTo(p1x + sDist2, p1y);
          ctx.closePath();
          const midX = (p1x + p2x) / 2;
          const sGrad2 = ctx.createLinearGradient(midX, 0, midX + sDist2, 0);
          sGrad2.addColorStop(0, `rgba(0, 0, 0, ${sOpacity2})`);
          sGrad2.addColorStop(0.45, `rgba(0, 0, 0, ${sOpacity2 * 0.32})`);
          sGrad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = sGrad2;
          ctx.fill();
          ctx.restore();
        }

        // 3. Vẽ Vạt cuốn cong 3D của trang đang lật
        if (flapWidth > 2) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(p1x, p1y);
          const bow = 16 * inFactor * outFactor;
          ctx.quadraticCurveTo((p1x + tx) / 2 + bow, (p1y + ty) / 2, tx, ty);
          ctx.quadraticCurveTo((tx + p2x) / 2 + bow, (ty + p2y) / 2, p2x, p2y);
          ctx.closePath();
          ctx.clip();

          // 3.1 Phản chiếu ảnh mặt sau trang sách qua nếp gấp
          if (imgTop && imgTop.complete) {
            ctx.save();
            const lineAngle = Math.atan2(p2y - p1y, p2x - p1x);
            ctx.translate(p1x, p1y);
            ctx.rotate(lineAngle);
            ctx.scale(1, -1);
            ctx.rotate(-lineAngle);
            ctx.translate(-p1x, -p1y);
            ctx.drawImage(imgTop, 0, 0, W, H);
            ctx.restore();
          }

          // 3.2 Lớp giấy ngà mờ theo theme
          const paperTint =
            readingTheme === 'sepia'
              ? 'rgba(244, 236, 216, 0.88)'
              : readingTheme === 'dark'
              ? 'rgba(30, 35, 45, 0.88)'
              : 'rgba(250, 248, 243, 0.88)';
          ctx.fillStyle = paperTint;
          ctx.fill();

          // 3.3 Dải sáng 3D uốn cong gân giấy (Specular 3D highlight & Paper Shading)
          const midX = (p1x + p2x) / 2;
          const fGrad = ctx.createLinearGradient(midX, 0, tx, ty);
          fGrad.addColorStop(0, 'rgba(215, 210, 200, 0.48)');
          fGrad.addColorStop(0.22, 'rgba(255, 255, 255, 0.94)');
          fGrad.addColorStop(0.50, 'rgba(245, 240, 230, 0.28)');
          fGrad.addColorStop(0.82, 'rgba(195, 188, 175, 0.44)');
          fGrad.addColorStop(1, 'rgba(110, 105, 92, 0.62)');
          ctx.fillStyle = fGrad;
          ctx.fill();

          // 3.4 Viền mép giấy mảnh tinh tế
          ctx.strokeStyle = `rgba(0, 0, 0, ${0.18 * inFactor * outFactor})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();

          ctx.restore();
        }

        drawSpineGutter(ctx, W, H);
      },
      [readingTheme, drawSpineGutter, drawStaticPage]
    );

    // ================= 2. BỘ DỰNG CHẾ ĐỘ ROLL 3D (VUỐT CUỘN 3D RIÊNG BIỆT) =================
    const drawRollNextFrame = useCallback(
      (progress: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width: W, height: H } = bookSizeRef.current;
        const curIdx = curIndexRef.current;
        const imgTop = imagesRef.current[curIdx];
        const imgUnder = imagesRef.current[Math.min(curIdx + 1, totalPages - 1)];

        const p = Math.max(0, Math.min(1, progress));
        if (p <= 0.001) {
          drawStaticPage(curIdx);
          return;
        }

        ctx.clearRect(0, 0, W, H);
        if (imgUnder && imgUnder.complete) {
          ctx.drawImage(imgUnder, 0, 0, W, H);
        }

        if (p >= 0.999) {
          drawSpineGutter(ctx, W, H);
          return;
        }

        const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        const foldTopX = (1 - ease) * W * 1.08;
        const foldBottomX = (1 - ease) * W * 0.94 - ease * W * 0.12;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(foldTopX, 0);
        ctx.lineTo(foldBottomX, H);
        ctx.lineTo(0, H);
        ctx.closePath();
        ctx.clip();
        if (imgTop && imgTop.complete) {
          ctx.drawImage(imgTop, 0, 0, W, H);
        }
        ctx.restore();

        const inFactor = Math.min(1, p / 0.08);
        const outFactor = Math.max(0, Math.min(1, (1 - p) / 0.1));
        const sW = Math.min(50, W * 0.14) * inFactor * outFactor;
        const maxShadow = 0.65 * inFactor * outFactor;

        if (sW > 1 && maxShadow > 0.02) {
          ctx.save();
          const midX = (foldTopX + foldBottomX) / 2;
          const sGrad = ctx.createLinearGradient(midX, 0, midX + sW, 0);
          sGrad.addColorStop(0, `rgba(0, 0, 0, ${maxShadow})`);
          sGrad.addColorStop(0.38, `rgba(0, 0, 0, ${maxShadow * 0.4})`);
          sGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = sGrad;

          ctx.beginPath();
          ctx.moveTo(foldTopX, 0);
          ctx.lineTo(foldTopX + sW, 0);
          ctx.lineTo(foldBottomX + sW, H);
          ctx.lineTo(foldBottomX, H);
          ctx.closePath();
          ctx.fill();
          ctx.restore();

          const cW = Math.min(38, W * 0.11) * inFactor * outFactor;
          const maxCrest = 0.55 * inFactor * outFactor;
          if (cW > 1 && maxCrest > 0.02) {
            ctx.save();
            const cGrad = ctx.createLinearGradient(midX - cW, 0, midX, 0);
            cGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
            cGrad.addColorStop(0.68, `rgba(255, 255, 255, ${maxCrest})`);
            cGrad.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
            ctx.fillStyle = cGrad;

            ctx.beginPath();
            ctx.moveTo(foldTopX - cW, 0);
            ctx.lineTo(foldTopX, 0);
            ctx.lineTo(foldBottomX, H);
            ctx.lineTo(foldBottomX - cW, H);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        }

        drawSpineGutter(ctx, W, H);
      },
      [totalPages, drawSpineGutter, drawStaticPage]
    );

    const drawRollPrevFrame = useCallback(
      (progress: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width: W, height: H } = bookSizeRef.current;
        const curIdx = curIndexRef.current;
        const imgUnder = imagesRef.current[curIdx];
        const imgTop = imagesRef.current[Math.max(0, curIdx - 1)];

        const p = Math.max(0, Math.min(1, progress));
        if (p <= 0.001) {
          drawStaticPage(curIdx);
          return;
        }

        ctx.clearRect(0, 0, W, H);
        if (imgUnder && imgUnder.complete) {
          ctx.drawImage(imgUnder, 0, 0, W, H);
        }

        if (p >= 0.999) {
          if (imgTop && imgTop.complete) {
            ctx.drawImage(imgTop, 0, 0, W, H);
          }
          drawSpineGutter(ctx, W, H);
          return;
        }

        const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        const foldTopX = ease * W * 1.08;
        const foldBottomX = ease * W * 0.94;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(foldTopX, 0);
        ctx.lineTo(foldBottomX, H);
        ctx.lineTo(0, H);
        ctx.closePath();
        ctx.clip();
        if (imgTop && imgTop.complete) {
          ctx.drawImage(imgTop, 0, 0, W, H);
        }
        ctx.restore();

        const inFactor = Math.min(1, p / 0.08);
        const outFactor = Math.max(0, Math.min(1, (1 - p) / 0.1));
        const sW = Math.min(50, W * 0.14) * inFactor * outFactor;
        const maxShadow = 0.65 * inFactor * outFactor;

        if (sW > 1 && maxShadow > 0.02) {
          ctx.save();
          const midX = (foldTopX + foldBottomX) / 2;
          const sGrad = ctx.createLinearGradient(midX, 0, midX + sW, 0);
          sGrad.addColorStop(0, `rgba(0, 0, 0, ${maxShadow})`);
          sGrad.addColorStop(0.38, `rgba(0, 0, 0, ${maxShadow * 0.4})`);
          sGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = sGrad;

          ctx.beginPath();
          ctx.moveTo(foldTopX, 0);
          ctx.lineTo(foldTopX + sW, 0);
          ctx.lineTo(foldBottomX + sW, H);
          ctx.lineTo(foldBottomX, H);
          ctx.closePath();
          ctx.fill();
          ctx.restore();

          const cW = Math.min(38, W * 0.11) * inFactor * outFactor;
          const maxCrest = 0.55 * inFactor * outFactor;
          if (cW > 1 && maxCrest > 0.02) {
            ctx.save();
            const cGrad = ctx.createLinearGradient(midX - cW, 0, midX, 0);
            cGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
            cGrad.addColorStop(0.68, `rgba(255, 255, 255, ${maxCrest})`);
            cGrad.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
            ctx.fillStyle = cGrad;

            ctx.beginPath();
            ctx.moveTo(foldTopX - cW, 0);
            ctx.lineTo(foldTopX, 0);
            ctx.lineTo(foldBottomX, H);
            ctx.lineTo(foldBottomX - cW, H);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        }

        drawSpineGutter(ctx, W, H);
      },
      [drawSpineGutter, drawStaticPage]
    );

    // ================= BỘ ĐIỀU PHỐI VẼ THEO CHẾ ĐỘ =================
    const drawNextFrame = useCallback(
      (progress: number) => {
        if (readingMode === 'roll') {
          drawRollNextFrame(progress);
        } else {
          drawCurlNextFrame(progress);
        }
      },
      [readingMode, drawRollNextFrame, drawCurlNextFrame]
    );

    const drawPrevFrame = useCallback(
      (progress: number) => {
        if (readingMode === 'roll') {
          drawRollPrevFrame(progress);
        } else {
          drawCurlPrevFrame(progress);
        }
      },
      [readingMode, drawRollPrevFrame, drawCurlPrevFrame]
    );

    // ================= BỘ HOẠT HỌA TIẾP TỤC KHÔNG GIẬT LÙI (SEAMLESS COMPLETION) =================
    // Hàm hãm tốc vật lý tự nhiên (Natural Deceleration Curves)
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);

    const animateNextCompletion = useCallback(
      (startProgress: number = 0) => {
        const curIdx = curIndexRef.current;
        if (curIdx >= totalPages - 1 || isAnimatingRef.current) return;

        if (animReqRef.current) cancelAnimationFrame(animReqRef.current);
        isAnimatingRef.current = true;

        const startTime = performance.now();
        // Giảm tốc độ lật trang thêm 13.6% (tăng duration từ 440ms lên 500ms) cho độ đầm tay tự nhiên
        const dur = Math.max(250, 500 * (1 - startProgress * 0.6));

        function step(now: number) {
          const elapsed = now - startTime;
          const frac = Math.min(1, elapsed / dur);
          const easedFrac = easeOutCubic(frac);
          const currentP = startProgress + (1 - startProgress) * easedFrac;

          drawNextFrame(currentP);

          if (frac < 1) {
            animReqRef.current = requestAnimationFrame(step);
          } else {
            isAnimatingRef.current = false;
            currentProgressRef.current = 0;
            const nextIdx = curIdx + 1;
            setCurrentPage(nextIdx);
            curIndexRef.current = nextIdx;
            drawStaticPage(nextIdx);
            onPageChangeRef.current?.(nextIdx);
          }
        }

        animReqRef.current = requestAnimationFrame(step);
      },
      [totalPages, drawNextFrame, drawStaticPage]
    );

    const animateNextCancel = useCallback(
      (startProgress: number) => {
        if (animReqRef.current) cancelAnimationFrame(animReqRef.current);
        isAnimatingRef.current = true;
        const curIdx = curIndexRef.current;
        const startTime = performance.now();
        // Giảm tốc độ rơi về vị trí cũ thêm 15% (345ms)
        const dur = Math.max(185, 345 * startProgress);

        function step(now: number) {
          const elapsed = now - startTime;
          const frac = Math.min(1, elapsed / dur);
          const easedFrac = easeOutQuad(frac);
          const currentP = startProgress * (1 - easedFrac);

          drawNextFrame(currentP);

          if (frac < 1) {
            animReqRef.current = requestAnimationFrame(step);
          } else {
            isAnimatingRef.current = false;
            currentProgressRef.current = 0;
            drawStaticPage(curIdx);
          }
        }

        animReqRef.current = requestAnimationFrame(step);
      },
      [drawNextFrame, drawStaticPage]
    );

    const animatePrevCompletion = useCallback(
      (startProgress: number = 0) => {
        const curIdx = curIndexRef.current;
        if (curIdx <= 0 || isAnimatingRef.current) return;

        if (animReqRef.current) cancelAnimationFrame(animReqRef.current);
        isAnimatingRef.current = true;

        const startTime = performance.now();
        // Giảm tốc độ lật trang thêm 13.6% (500ms)
        const dur = Math.max(250, 500 * (1 - startProgress * 0.6));

        function step(now: number) {
          const elapsed = now - startTime;
          const frac = Math.min(1, elapsed / dur);
          const easedFrac = easeOutCubic(frac);
          const currentP = startProgress + (1 - startProgress) * easedFrac;

          drawPrevFrame(currentP);

          if (frac < 1) {
            animReqRef.current = requestAnimationFrame(step);
          } else {
            isAnimatingRef.current = false;
            currentProgressRef.current = 0;
            const prevIdx = curIdx - 1;
            setCurrentPage(prevIdx);
            curIndexRef.current = prevIdx;
            drawStaticPage(prevIdx);
            onPageChangeRef.current?.(prevIdx);
          }
        }

        animReqRef.current = requestAnimationFrame(step);
      },
      [drawPrevFrame, drawStaticPage]
    );

    const animatePrevCancel = useCallback(
      (startProgress: number) => {
        if (animReqRef.current) cancelAnimationFrame(animReqRef.current);
        isAnimatingRef.current = true;
        const curIdx = curIndexRef.current;
        const startTime = performance.now();
        // Giảm tốc độ rơi về thêm 15% (345ms)
        const dur = Math.max(185, 345 * startProgress);

        function step(now: number) {
          const elapsed = now - startTime;
          const frac = Math.min(1, elapsed / dur);
          const easedFrac = easeOutQuad(frac);
          const currentP = startProgress * (1 - easedFrac);

          drawPrevFrame(currentP);

          if (frac < 1) {
            animReqRef.current = requestAnimationFrame(step);
          } else {
            isAnimatingRef.current = false;
            currentProgressRef.current = 0;
            drawStaticPage(curIdx);
          }
        }

        animReqRef.current = requestAnimationFrame(step);
      },
      [drawPrevFrame, drawStaticPage]
    );

    // Kích hoạt lật tới trang kế tiếp (Flip Next)
    const flipNext = useCallback(() => {
      animateNextCompletion(0);
    }, [animateNextCompletion]);

    // Kích hoạt lật lùi về trang trước (Flip Prev)
    const flipPrev = useCallback(() => {
      animatePrevCompletion(0);
    }, [animatePrevCompletion]);

    // Chuyển trang trực tiếp (Seekbar)
    const goToPage = useCallback(
      (pageNum: number) => {
        if (pageNum < 0 || pageNum >= totalPages) return;
        if (animReqRef.current) cancelAnimationFrame(animReqRef.current);
        isAnimatingRef.current = false;
        currentProgressRef.current = 0;
        setCurrentPage(pageNum);
        curIndexRef.current = pageNum;
        drawStaticPage(pageNum);
        onPageChangeRef.current?.(pageNum);
      },
      [totalPages, drawStaticPage]
    );

    const toggleZoom = useCallback(() => {
      setZoomScale((prev) => {
        if (prev > 1.05) {
          setPanOffset({ x: 0, y: 0 });
          return 1;
        }
        return 1.6;
      });
    }, []);

    const zoomIn = useCallback(() => {
      setZoomScale((prev) => Math.min(3.0, Number((prev + 0.3).toFixed(2))));
    }, []);

    const zoomOut = useCallback(() => {
      setZoomScale((prev) => {
        const next = Math.max(0.75, Number((prev - 0.3).toFixed(2)));
        if (next <= 1) setPanOffset({ x: 0, y: 0 });
        return next;
      });
    }, []);

    const resetZoom = useCallback(() => {
      setZoomScale(1);
      setPanOffset({ x: 0, y: 0 });
    }, []);

    useImperativeHandle(ref, () => ({
      flipNext,
      flipPrev,
      goToPage,
      toggleZoom,
      zoomIn,
      zoomOut,
      resetZoom,
      getZoomScale: () => zoomScale,
    }));

    // Đồng bộ trang hiện tại khi initialPage từ component cha thay đổi
    useEffect(() => {
      if (
        initialPage !== undefined &&
        initialPage >= 0 &&
        initialPage < totalPages &&
        initialPage !== curIndexRef.current
      ) {
        goToPage(initialPage);
      }
    }, [initialPage, goToPage, totalPages]);

    // Thiết lập kích thước Canvas và nạp ảnh
    useEffect(() => {
      if (readingMode === 'scroll') return;

      let isMounted = true;

      function updateCanvasSize() {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        const cW = container.clientWidth || window.innerWidth;
        const cH = container.clientHeight || window.innerHeight;

        // Tối ưu FULL KHUNG cho mọi màn hình (Điện thoại, Máy tính bảng, Máy tính)
        // Khổ sách chuẩn A4 1 : 1.414 (aspect = 0.707)
        const aspect = 0.707;
        const maxAvailableH = Math.max(380, cH - 6);
        const maxAvailableW = Math.max(260, cW - 6);

        // Chiều cao và chiều rộng tối đa tận dụng tối đa không gian màn hình
        let bH = maxAvailableH;
        let bW = Math.round(bH * aspect);

        if (bW > maxAvailableW) {
          bW = maxAvailableW;
          bH = Math.round(bW / aspect);
        }

        bW = Math.max(260, bW);
        bH = Math.max(380, bH);

        bookSizeRef.current = { width: bW, height: bH };

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = bW * dpr;
        canvas.height = bH * dpr;
        canvas.style.width = `${bW}px`;
        canvas.style.height = `${bH}px`;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.scale(dpr, dpr);
        }

        drawStaticPage(curIndexRef.current);
      }

      // Nạp toàn bộ ảnh vào bộ nhớ đệm
      imagesRef.current = [];
      let loadedCount = 0;
      let rescueTimer: any = null;

      const markReady = () => {
        if (!isMounted) return;
        setIsReady(true);
        updateCanvasSize();
      };

      const validImages = pageImages.filter((src) => typeof src === 'string' && src.trim().length > 0);

      if (validImages.length === 0) {
        markReady();
      } else {
        pageImages.forEach((src, idx) => {
          if (!src || !src.trim()) {
            imagesRef.current[idx] = null as any;
            return;
          }
          const img = new Image();
          const onFinish = () => {
            if (!isMounted) return;
            loadedCount++;
            // Chỉ cần trang hiện tại hoặc ít nhất 1 trang đã nạp xong là mở ngay
            if (idx === curIndexRef.current || loadedCount >= 1) {
              markReady();
            }
          };
          img.onload = onFinish;
          img.onerror = onFinish;
          img.src = src;
          if (img.complete) {
            onFinish();
          }
          imagesRef.current[idx] = img;
        });

        // Timer cứu hộ siêu an toàn (400ms) đảm bảo canvas luôn mở, không bao giờ bị kẹt spinner
        rescueTimer = setTimeout(() => {
          markReady();
        }, 400);
      }

      updateCanvasSize();
      window.addEventListener('resize', updateCanvasSize);

      return () => {
        isMounted = false;
        if (rescueTimer) clearTimeout(rescueTimer);
        window.removeEventListener('resize', updateCanvasSize);
        if (animReqRef.current) cancelAnimationFrame(animReqRef.current);
        if (moveRafRef.current) cancelAnimationFrame(moveRafRef.current);
      };
    }, [pageImages, readingMode, drawStaticPage]);

    // Xử lý cử chỉ 2 ngón tay chụm / xòe để Thu Phóng sách (Pinch-to-zoom chuẩn SideBooks)
    const pinchDistRef = useRef<{ dist: number; scale: number } | null>(null);
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const onTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 2) {
          e.preventDefault();
          const d = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          pinchDistRef.current = { dist: d, scale: zoomScale };
        }
      };

      const onTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 2 && pinchDistRef.current) {
          e.preventDefault();
          const d = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          if (pinchDistRef.current.dist > 15) {
            const ratio = d / pinchDistRef.current.dist;
            const newScale = Math.min(3.0, Math.max(0.75, pinchDistRef.current.scale * ratio));
            setZoomScale(Number(newScale.toFixed(2)));
          }
        }
      };

      const onTouchEnd = (e: TouchEvent) => {
        if (e.touches.length < 2) {
          pinchDistRef.current = null;
        }
      };

      canvas.addEventListener('touchstart', onTouchStart, { passive: false });
      canvas.addEventListener('touchmove', onTouchMove, { passive: false });
      canvas.addEventListener('touchend', onTouchEnd);
      canvas.addEventListener('touchcancel', onTouchEnd);

      return () => {
        canvas.removeEventListener('touchstart', onTouchStart);
        canvas.removeEventListener('touchmove', onTouchMove);
        canvas.removeEventListener('touchend', onTouchEnd);
        canvas.removeEventListener('touchcancel', onTouchEnd);
      };
    }, [zoomScale]);

    // ================= XỬ LÝ CỬ CHỈ CHẠM VUỐT CHUẨN XÁC, KHÔNG KHỰNG (SOFT-START ENGINE) =================
    const GESTURE_THRESHOLD = 5; // Ngưỡng nhận diện cử chỉ nhạy bén (5px)

    // Hàm khử khựng ban đầu: Triệt tiêu bước nhảy bậc tức thì khi vừa chạm kéo
    const computeSmoothProgress = (rawDelta: number, maxW: number) => {
      const rawDist = Math.max(0, rawDelta);
      if (rawDist <= GESTURE_THRESHOLD) return 0;
      const effective = rawDist - GESTURE_THRESHOLD;
      // Damping mềm mại trong 28px đầu tiên theo đường cong lũy thừa mượt mà (Soft Entry Damping)
      const ramp = effective < 28 ? Math.pow(effective / 28, 1.4) * effective : effective;
      return Math.min(0.9, ramp / (maxW * 0.85));
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (isAnimatingRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      try {
        (e.currentTarget as HTMLElement)?.setPointerCapture?.(e.pointerId);
      } catch (_) {}

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      pointerStateRef.current = {
        isDown: true,
        startX: x,
        startY: y,
        startTime: Date.now(),
        lastX: x,
        lastY: y,
        mode: null,
        hasMoved: false,
      };
      (pointerStateRef.current as any).lastClientX = e.clientX;
      (pointerStateRef.current as any).lastClientY = e.clientY;
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const state = pointerStateRef.current;
      if (!state.isDown || isAnimatingRef.current) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      // Xử lý kéo xoay (pan) khi đang ở chế độ Thu Phóng (Zoom)
      if (zoomScale > 1.05) {
        state.hasMoved = true;
        isPanningRef.current = true;
        const lastCX = (state as any).lastClientX ?? e.clientX;
        const lastCY = (state as any).lastClientY ?? e.clientY;
        const dx = e.clientX - lastCX;
        const dy = e.clientY - lastCY;
        (state as any).lastClientX = e.clientX;
        (state as any).lastClientY = e.clientY;

        setPanOffset((prev) => ({
          x: Math.max(-160, Math.min(160, prev.x + dx / zoomScale)),
          y: Math.max(-240, Math.min(240, prev.y + dy / zoomScale)),
        }));
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(bookSizeRef.current.width, e.clientX - rect.left));
      const y = Math.max(0, Math.min(bookSizeRef.current.height, e.clientY - rect.top));
      const { width: W } = bookSizeRef.current;
      const curIdx = curIndexRef.current;

      state.lastX = x;
      state.lastY = y;

      const dx = x - state.startX;
      const dy = y - state.startY;

      // Xác định cử chỉ di chuyển với ngưỡng mềm 5px
      if (!state.hasMoved && (Math.abs(dx) > GESTURE_THRESHOLD || Math.abs(dy) > GESTURE_THRESHOLD)) {
        state.hasMoved = true;
        if (dx < -GESTURE_THRESHOLD && curIdx < totalPages - 1) {
          state.mode = 'drag_next';
        } else if (dx > GESTURE_THRESHOLD && curIdx > 0) {
          state.mode = 'drag_prev';
        }
      }

      // Xử lý kéo với hàm làm mịn gia tốc Soft-Start
      if (state.mode === 'drag_next') {
        const progress = computeSmoothProgress(state.startX - x, W);
        currentProgressRef.current = progress;
        pendingFrameRef.current = { mode: 'next', progress };

        if (!moveRafRef.current) {
          moveRafRef.current = requestAnimationFrame(() => {
            moveRafRef.current = null;
            if (pendingFrameRef.current) {
              if (pendingFrameRef.current.mode === 'next') {
                drawNextFrame(pendingFrameRef.current.progress);
              } else {
                drawPrevFrame(pendingFrameRef.current.progress);
              }
            }
          });
        }
      } else if (state.mode === 'drag_prev') {
        const progress = computeSmoothProgress(x - state.startX, W);
        currentProgressRef.current = progress;
        pendingFrameRef.current = { mode: 'prev', progress };

        if (!moveRafRef.current) {
          moveRafRef.current = requestAnimationFrame(() => {
            moveRafRef.current = null;
            if (pendingFrameRef.current) {
              if (pendingFrameRef.current.mode === 'next') {
                drawNextFrame(pendingFrameRef.current.progress);
              } else {
                drawPrevFrame(pendingFrameRef.current.progress);
              }
            }
          });
        }
      }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
      try {
        (e.currentTarget as HTMLElement)?.releasePointerCapture?.(e.pointerId);
      } catch (_) {}

      if (moveRafRef.current) {
        cancelAnimationFrame(moveRafRef.current);
        moveRafRef.current = null;
      }

      const state = pointerStateRef.current;
      if (!state.isDown) return;
      state.isDown = false;
      isPanningRef.current = false;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const elapsed = Date.now() - state.startTime;
      const dx = x - state.startX;
      const dy = e.clientY - rect.top - state.startY;
      const dist = Math.hypot(dx, dy);
      const { width: W } = bookSizeRef.current;

      // 1. Nhận diện cú chạm (Tap Zone) hoặc Double-tap để thu phóng (Zoom):
      if (!state.hasMoved || (dist < 15 && elapsed < 350)) {
        const now = Date.now();
        if (now - lastTapTimeRef.current < 320) {
          // Nhấp đúp: Bật / Tắt thu phóng
          lastTapTimeRef.current = 0;
          if (zoomScale > 1.05) {
            setZoomScale(1);
            setPanOffset({ x: 0, y: 0 });
          } else {
            setZoomScale(1.85);
            const offsetX = Math.max(-100, Math.min(100, (W / 2 - state.startX) * 0.5));
            const offsetY = Math.max(-140, Math.min(140, (bookSizeRef.current.height / 2 - state.startY) * 0.5));
            setPanOffset({ x: offsetX, y: offsetY });
          }
          return;
        }
        lastTapTimeRef.current = now;

        if (zoomScale > 1.05) {
          onCenterClickRef.current?.();
          return;
        }

        if (state.startX < W * 0.28) {
          flipPrev();
        } else if (state.startX > W * 0.72) {
          flipNext();
        } else {
          onCenterClickRef.current?.();
        }
        return;
      }

      // 2. Nhận diện cử chỉ vuốt / kéo (Swipe / Drag):
      const mode = state.mode;
      state.mode = null;
      const prog = currentProgressRef.current;

      if (mode === 'drag_next') {
        if (prog > 0.22 || dx < -35 || (dx < -15 && elapsed < 300)) {
          animateNextCompletion(prog);
        } else {
          animateNextCancel(prog);
        }
      } else if (mode === 'drag_prev') {
        if (prog > 0.22 || dx > 35 || (dx > 15 && elapsed < 300)) {
          animatePrevCompletion(prog);
        } else {
          animatePrevCancel(prog);
        }
      }
    };

    return (
      <div
        ref={containerRef}
        style={{ touchAction: readingMode === 'scroll' ? 'pan-y' : 'none' }}
        className={`relative w-full h-full flex items-center justify-center select-none ${className}`}
      >
        {readingMode !== 'scroll' ? (
          <div
            className="relative flex items-center justify-center shadow-2xl rounded-sm overflow-hidden"
            style={{
              touchAction: 'none',
              transform: `scale(${zoomScale}) translate(${panOffset.x}px, ${panOffset.y}px)`,
              transformOrigin: 'center center',
              transition: isPanningRef.current ? 'none' : 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="block cursor-pointer select-none"
              style={{ touchAction: 'none', opacity: isReady ? 1 : 0 }}
            />

            {/* Nút Thu lại khi đang phóng to */}
            {zoomScale > 1.05 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomScale(1);
                  setPanOffset({ x: 0, y: 0 });
                }}
                className="absolute top-2.5 left-2.5 z-40 px-2.5 py-1 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] shadow-xl flex items-center gap-1 active:scale-95 transition-all cursor-pointer backdrop-blur-md"
              >
                <span>Thu lại (1x)</span>
              </button>
            )}

            {/* Spinner chờ nạp ảnh */}
            {!isReady && (
              <div className="absolute inset-0 bg-slate-900/60 rounded-xl border border-white/10 flex flex-col items-center justify-center text-slate-300 gap-3">
                <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-medium tracking-wide text-slate-300">
                  Đang mở sách...
                </span>
              </div>
            )}
          </div>
        ) : (
          <div
            className="w-full h-full overflow-y-auto overscroll-contain px-2 sm:px-4 py-4 flex flex-col items-center gap-6"
            style={{ touchAction: 'pan-y' }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                onCenterClickRef.current?.();
              }
            }}
          >
            {pageImages.map((imgUrl, idx) => (
              <div
                key={idx}
                onClick={() => onCenterClickRef.current?.()}
                className={`max-w-[520px] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl w-full shrink-0 rounded-2xl overflow-hidden shadow-[0_12px_36px_rgba(0,0,0,0.65)] border transition-all cursor-pointer ${
                  readingTheme === 'sepia'
                    ? 'bg-[#2b241c] border-amber-900/50 text-[#f4ecd8]'
                    : readingTheme === 'ivory'
                    ? 'bg-[#f7f5ee] border-amber-200/80 text-slate-900'
                    : 'bg-[#12161f] border-white/10 text-slate-100'
                }`}
              >
                <img
                  src={imgUrl}
                  alt={`Trang ${idx + 1}`}
                  className="w-full h-auto object-contain block select-none"
                  loading="lazy"
                />
                <div
                  className={`py-2 px-3 text-center text-[11px] font-mono font-bold flex items-center justify-between border-t ${
                    readingTheme === 'sepia'
                      ? 'bg-black/30 border-amber-900/30 text-amber-200/80'
                      : readingTheme === 'ivory'
                      ? 'bg-amber-100/50 border-amber-200/60 text-slate-700'
                      : 'bg-black/50 border-white/5 text-slate-400'
                  }`}
                >
                  <span className="text-[10px] opacity-75">Qbiz Books</span>
                  <span>Trang {idx + 1} / {totalPages}</span>
                  <span className="text-[10px] opacity-75">Cuộn dọc</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);

SideBooksReaderEngine.displayName = 'SideBooksReaderEngine';

export default SideBooksReaderEngine;
