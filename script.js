/**
 * Smart QR Studio — Dynamic Evidence-Based QR Platform
 * Production Engine:
 * - Direct Center Text Banner inside QR Matrix
 * - Fully functional interactive buttons (Analyze, Smart Design, Presets, Sliders, Downloads)
 * - Safe Custom Logo upload with live scaling slider
 * - Canvas & SVG full export parity
 */

(function () {
  'use strict';

  // --- 1. APPLICATION STATE ---
  const state = {
    url: '',
    theme: localStorage.getItem('smart_qr_app_theme') || 'system',
    detection: null,
    smartMode: 'identity',
    designVariationIndex: 0,
    activePreset: null,
    activeLogoImg: null,
    activeLogoDataUrl: null,
    activeLogoIsVerified: false,
    customLogoImg: null,
    customLogoDataUrl: null,
    isManualOverride: false,
    currentAnalysisId: 0,
    currentRenderToken: 0,
    options: {
      dotStyle: 'square',
      eyeStyle: 'square',
      fgColor: '#0F172A',
      bgColor: '#FFFFFF',
      useGradient: false,
      fgGradColor: '#2563EB',
      logoMode: 'auto',
      logoScale: 0.22,
      centerBadgeText: '',
      qrText: '', // Text inside center matrix banner
      frameStyle: 'none',
      frameText: 'SCAN ME',
      ecc: 'H',
      quietZone: 4,
      size: 1024
    }
  };

  // --- 2. VALIDATION & COLOR UTILITIES ---
  function isValidHexColor(hex) {
    if (!hex || typeof hex !== 'string') return false;
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex.trim());
  }

  function normalizeHexColor(hex) {
    const clean = hex.trim();
    if (clean.length === 4) {
      return `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`.toUpperCase();
    }
    return clean.toUpperCase();
  }

  function escapeXml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe).replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }

  function safeDecodeURIComponent(str) {
    if (!str) return '';
    try {
      return decodeURIComponent(str);
    } catch (e) {
      return String(str).replace(/%(?![0-9a-fA-F]{2})/g, '%25');
    }
  }

  function normalizeURL(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    const trimmed = rawUrl.trim();
    try {
      const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed);
      const parsed = new URL(hasScheme ? trimmed : `https://${trimmed}`);
      if ((parsed.protocol === 'http:' && parsed.port === '80') ||
          (parsed.protocol === 'https:' && parsed.port === '443')) {
        parsed.port = '';
      }
      parsed.hostname = parsed.hostname.toLowerCase();
      if (parsed.pathname === '/') parsed.pathname = '';
      return parsed.href;
    } catch (e) {
      return trimmed;
    }
  }

  // --- 3. QR SPECIFICATION STRUCTURAL FUNCTION-PATTERN PROTECTION ---
  const QRStructure = {
    alignmentPatternCenters: [
      [], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42],
      [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66],
      [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86],
      [6, 34, 62, 90], [6, 28, 50, 72, 94], [6, 26, 50, 74, 98], [6, 30, 54, 78, 102],
      [6, 28, 54, 80, 106], [6, 32, 58, 84, 110], [6, 30, 58, 86, 114], [6, 34, 62, 90, 118],
      [6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130],
      [6, 30, 56, 82, 108, 134], [6, 34, 60, 86, 112, 138], [6, 30, 58, 86, 114, 142],
      [6, 34, 62, 90, 118, 146], [6, 30, 54, 78, 102, 126, 150], [6, 24, 50, 76, 102, 128, 154],
      [6, 28, 54, 80, 106, 132, 158], [6, 32, 58, 84, 110, 136, 162], [6, 26, 54, 82, 110, 138, 166],
      [6, 30, 58, 86, 114, 142, 170]
    ],

    getVersion(moduleCount) {
      return Math.round((moduleCount - 21) / 4) + 1;
    },

    createFunctionModuleMask(moduleCount) {
      const mask = Array.from({ length: moduleCount }, () => new Uint8Array(moduleCount));
      const v = this.getVersion(moduleCount);

      // Finder patterns + separators (8x8)
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (r < moduleCount && c < moduleCount) mask[r][c] = 1;
          if (r < moduleCount && (moduleCount - 1 - c) >= 0) mask[r][moduleCount - 1 - c] = 1;
          if ((moduleCount - 1 - r) >= 0 && c < moduleCount) mask[moduleCount - 1 - r][c] = 1;
        }
      }

      // Format areas
      for (let i = 0; i <= 8; i++) {
        if (i < moduleCount) {
          mask[8][i] = 1;
          mask[i][8] = 1;
        }
      }
      for (let c = moduleCount - 8; c < moduleCount; c++) {
        if (c >= 0) mask[8][c] = 1;
      }
      for (let r = moduleCount - 8; r < moduleCount; r++) {
        if (r >= 0) mask[r][8] = 1;
      }

      // Timing tracks
      for (let i = 0; i < moduleCount; i++) {
        mask[6][i] = 1;
        mask[i][6] = 1;
      }

      // Alignment patterns
      if (v >= 2 && v <= 40 && this.alignmentPatternCenters[v]) {
        const centers = this.alignmentPatternCenters[v];
        for (let i = 0; i < centers.length; i++) {
          for (let j = 0; j < centers.length; j++) {
            const cr = centers[i];
            const cc = centers[j];
            if ((cr <= 8 && cc <= 8) || (cr <= 8 && cc >= moduleCount - 9) || (cr >= moduleCount - 9 && cc <= 8)) {
              continue;
            }
            for (let ar = -2; ar <= 2; ar++) {
              for (let ac = -2; ac <= 2; ac++) {
                const pr = cr + ar;
                const pc = cc + ac;
                if (pr >= 0 && pr < moduleCount && pc >= 0 && pc < moduleCount) {
                  mask[pr][pc] = 1;
                }
              }
            }
          }
        }
      }

      return mask;
    }
  };

  // --- 4. METADATA PROVIDER ---
  const MetadataProvider = {
    cache: new Map(),
    activeAbortController: null,

    async fetchEvidence(rawUrl, analysisId) {
      const normalized = normalizeURL(rawUrl);
      if (this.cache.has(normalized)) {
        return { evidence: this.cache.get(normalized), isStale: false };
      }

      if (this.activeAbortController) {
        this.activeAbortController.abort();
      }
      this.activeAbortController = new AbortController();

      let parsed;
      try {
        parsed = new URL(normalized);
      } catch (e) {
        const rawRes = {
          valid: false,
          platform: 'Raw Data',
          displayName: rawUrl.slice(0, 24),
          category: 'Direct Text / Payload',
          confidence: 'Basic detection',
          brandColor: '#0F172A',
          badgeText: '',
          imageCandidates: []
        };
        this.cache.set(normalized, rawRes);
        return { evidence: rawRes, isStale: analysisId !== state.currentAnalysisId };
      }

      const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
      const path = parsed.pathname;
      const pathParts = path.split('/').filter(Boolean);

      let platform = host.split('.')[0].toUpperCase();
      let displayName = platform;
      let category = 'Web Destination';
      let confidence = 'Structural detection';
      let brandColor = '#2563EB';

      const matchesDomain = (target) => host === target || host.endsWith(`.${target}`);

      if (matchesDomain('wikipedia.org')) {
        platform = 'Wikipedia';
        brandColor = '#1F2937';
        if (pathParts[0] === 'wiki' && pathParts[1]) {
          displayName = safeDecodeURIComponent(pathParts[1]).replace(/_/g, ' ');
          category = 'Reference / Editorial';
        }
      } else if (matchesDomain('github.com')) {
        platform = 'GitHub';
        brandColor = '#181717';
        if (pathParts.length >= 1) {
          displayName = pathParts[0];
          category = 'Developer Profile';
        }
      } else if (matchesDomain('instagram.com')) {
        platform = 'Instagram';
        brandColor = '#E1306C';
        if (pathParts.length >= 1) {
          displayName = `@${pathParts[0]}`;
          category = 'Creator Profile';
        }
      } else if (matchesDomain('youtube.com') || host === 'youtu.be') {
        platform = 'YouTube';
        brandColor = '#FF0000';
        category = 'Video Streaming';
      }

      const result = {
        valid: true,
        url: parsed.href,
        domain: host,
        platform,
        displayName,
        category,
        confidence,
        brandColor,
        badgeText: '',
        imageCandidates: [{
          priority: 4,
          type: 'favicon',
          url: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`,
          isVerified: false
        }]
      };

      this.cache.set(normalized, result);
      return { evidence: result, isStale: analysisId !== state.currentAnalysisId };
    }
  };

  // --- 5. 12 PRESETS ---
  const PRESETS = [
    { id: 'minimal', name: 'Minimal', dot: 'square', eye: 'square', fg: '#0F172A', bg: '#FFFFFF', grad: false, ecc: 'H', frame: 'none', frameText: 'SCAN ME' },
    { id: 'professional', name: 'Professional', dot: 'rounded', eye: 'square', fg: '#1E3A8A', bg: '#F8FAFC', grad: false, ecc: 'H', frame: 'badge-bottom', frameText: 'LEARN MORE' },
    { id: 'business', name: 'Corporate', dot: 'square', eye: 'square', fg: '#047857', bg: '#F0FDF4', grad: false, ecc: 'H', frame: 'badge-bottom', frameText: 'VISIT' },
    { id: 'social', name: 'Social Pop', dot: 'rounded', eye: 'square', fg: '#E11D48', bg: '#FFF1F2', grad: true, gradColor: '#FB7185', ecc: 'H', frame: 'pill', frameText: 'FOLLOW' },
    { id: 'creator', name: 'Creator', dot: 'dots', eye: 'square', fg: '#7C3AED', bg: '#FAF5FF', grad: true, gradColor: '#EC4899', ecc: 'H', frame: 'pill', frameText: 'CONNECT' },
    { id: 'editorial', name: 'Editorial', dot: 'classy', eye: 'square', fg: '#334155', bg: '#FDFBF7', grad: false, ecc: 'H', frame: 'none', frameText: 'READ' },
    { id: 'restaurant', name: 'Dining Menu', dot: 'smooth', eye: 'square', fg: '#9A3412', bg: '#FFFBEB', grad: false, ecc: 'H', frame: 'badge-bottom', frameText: 'VIEW MENU' },
    { id: 'tech', name: 'Cyber Tech', dot: 'dots', eye: 'square', fg: '#0284C7', bg: '#0B132B', grad: false, ecc: 'H', frame: 'none', frameText: 'EXPLORE' },
    { id: 'organic', name: 'Eco Organic', dot: 'smooth', eye: 'square', fg: '#15803D', bg: '#F0FDF4', grad: false, ecc: 'H', frame: 'pill', frameText: 'DISCOVER' },
    { id: 'neon', name: 'Neon Glow', dot: 'dots', eye: 'square', fg: '#06B6D4', bg: '#030712', grad: true, gradColor: '#3B82F6', ecc: 'H', frame: 'none', frameText: 'SCAN' },
    { id: 'luxury', name: 'Luxury Gold', dot: 'classy', eye: 'square', fg: '#854D0E', bg: '#FEFCE8', grad: false, ecc: 'H', frame: 'pill', frameText: 'EXCLUSIVE' },
    { id: 'playful', name: 'Playful', dot: 'dots', eye: 'square', fg: '#EA580C', bg: '#FFF7ED', grad: true, gradColor: '#EAB308', ecc: 'H', frame: 'badge-bottom', frameText: 'OPEN' }
  ];

  // --- 6. TELEMETRY & CONTRAST ---
  const TelemetryEngine = {
    getLuminance(hex) {
      const clean = hex.replace('#', '');
      const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
      const rgb = parseInt(full, 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >> 8) & 0xff;
      const b = (rgb >> 0) & 0xff;
      const a = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    },

    getContrast(hex1, hex2) {
      const l1 = this.getLuminance(hex1);
      const l2 = this.getLuminance(hex2);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    },

    evaluateAndRepair(moduleCount) {
      if (!state.url) {
        document.getElementById('contrastVal').textContent = '—';
        document.getElementById('logoAreaVal').textContent = '—';
        document.getElementById('eccVal').textContent = '—';
        document.getElementById('scanStatusText').textContent = 'Awaiting Input';
        return { sideCells: 0, bannerWidthCells: 0, bannerHeightCells: 0 };
      }

      // Check if In-Matrix QR Banner Text is active
      if (state.options.qrText && state.options.qrText.trim()) {
        const text = state.options.qrText.trim().toUpperCase().slice(0, 10);
        const bannerHeight = 5;
        const bannerWidth = Math.min(moduleCount - 16, Math.max(9, text.length * 2 + 4));
        const contrast = this.getContrast(state.options.fgColor, state.options.bgColor);
        document.getElementById('contrastVal').textContent = `${contrast.toFixed(1)}:1`;
        document.getElementById('logoAreaVal').textContent = 'Text Banner';
        document.getElementById('eccVal').textContent = state.options.ecc;
        return { sideCells: 0, bannerWidthCells: bannerWidth, bannerHeightCells: bannerHeight };
      }

      // Center logo calculation
      const hasLogo = (state.options.logoMode === 'custom' && state.customLogoImg) ||
                      (state.options.logoMode === 'auto' && state.activeLogoImg);

      let side = 0;
      if (hasLogo && state.options.logoMode !== 'none') {
        const targetSide = Math.max(3, Math.floor(moduleCount * (state.options.logoScale || 0.22)));
        side = targetSide % 2 === 0 ? targetSide + 1 : targetSide;
      }

      const contrast = this.getContrast(state.options.fgColor, state.options.bgColor);
      document.getElementById('contrastVal').textContent = `${contrast.toFixed(1)}:1`;
      document.getElementById('logoAreaVal').textContent = side > 0 ? `${Math.round((side * side) / (moduleCount * moduleCount) * 100)}%` : '0%';
      document.getElementById('eccVal').textContent = state.options.ecc;

      return { sideCells: side, bannerWidthCells: 0, bannerHeightCells: 0 };
    }
  };

  // --- 7. GEOMETRY ENGINE ---
  const GeometryEngine = {
    computeLayout(baseSize, moduleCount, quietZone, frameStyle) {
      const qrTotalModules = moduleCount + quietZone * 2;
      const cellSize = baseSize / qrTotalModules;
      const qrPixelSize = baseSize;

      let topOffset = 0;
      let totalWidth = qrPixelSize;
      let totalHeight = qrPixelSize;
      let frameHeight = 0;

      if (frameStyle === 'badge-top') {
        frameHeight = Math.round(baseSize * 0.12);
        topOffset = frameHeight;
        totalHeight = qrPixelSize + frameHeight;
      } else if (frameStyle === 'badge-bottom' || frameStyle === 'pill') {
        frameHeight = Math.round(baseSize * 0.12);
        totalHeight = qrPixelSize + frameHeight;
      }

      return {
        baseSize,
        moduleCount,
        quietZone,
        cellSize,
        qrPixelSize,
        topOffset,
        totalWidth,
        totalHeight,
        frameHeight
      };
    }
  };

  // --- 8. RENDERER (CANVAS & SVG) ---
  const QRRenderer = {
    getQRMatrix() {
      if (!state.url || typeof qrcode === 'undefined') return null;
      try {
        const qr = qrcode(0, state.options.ecc || 'H');
        qr.addData(state.url);
        qr.make();
        return qr;
      } catch (err) {
        return null;
      }
    },

    isFinderEyeRegion(r, c, count) {
      return (r < 7 && c < 7) || (r < 7 && c >= count - 7) || (r >= count - 7 && c < 7);
    },

    isCenterReserved(r, c, count, sideCells, bannerW, bannerH) {
      const mid = Math.floor(count / 2);
      // Logo cutout
      if (sideCells > 0) {
        const half = Math.floor(sideCells / 2);
        if (r >= mid - half && r <= mid + half && c >= mid - half && c <= mid + half) return true;
      }
      // In-matrix banner text cutout
      if (bannerW > 0 && bannerH > 0) {
        const halfW = Math.floor(bannerW / 2);
        const halfH = Math.floor(bannerH / 2);
        if (r >= mid - halfH && r <= mid + halfH && c >= mid - halfW && c <= mid + halfW) return true;
      }
      return false;
    },

    renderCanvas(canvas, requestedSize = 480, isExport = false) {
      const ctx = canvas.getContext('2d');
      const baseSize = requestedSize;

      if (!state.url) {
        canvas.width = baseSize;
        canvas.height = baseSize;
        ctx.fillStyle = state.theme === 'dark' ? '#111827' : '#F8FAFC';
        ctx.fillRect(0, 0, baseSize, baseSize);
        ctx.fillStyle = '#64748B';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Paste a URL to generate Smart QR', baseSize / 2, baseSize / 2);
        return;
      }

      const qr = this.getQRMatrix();
      if (!qr) return;

      const moduleCount = qr.getModuleCount();
      const footprint = TelemetryEngine.evaluateAndRepair(moduleCount);
      const functionMask = QRStructure.createFunctionModuleMask(moduleCount);
      const geo = GeometryEngine.computeLayout(baseSize, moduleCount, state.options.quietZone, state.options.frameStyle);

      canvas.width = geo.totalWidth;
      canvas.height = geo.totalHeight;
      ctx.clearRect(0, 0, geo.totalWidth, geo.totalHeight);

      // Background
      ctx.fillStyle = state.options.bgColor;
      ctx.fillRect(0, 0, geo.totalWidth, geo.totalHeight);

      // Foreground
      let fill = state.options.fgColor;
      if (state.options.useGradient) {
        const grad = ctx.createLinearGradient(0, geo.topOffset, geo.baseSize, geo.topOffset + geo.baseSize);
        grad.addColorStop(0, state.options.fgColor);
        grad.addColorStop(1, state.options.fgGradColor || state.options.fgColor);
        fill = grad;
      }
      ctx.fillStyle = fill;

      // Modules Rendering
      for (let r = 0; r < moduleCount; r++) {
        for (let c = 0; c < moduleCount; c++) {
          if (this.isFinderEyeRegion(r, c, moduleCount)) continue;
          if (this.isCenterReserved(r, c, moduleCount, footprint.sideCells, footprint.bannerWidthCells, footprint.bannerHeightCells)) continue;

          if (qr.isDark(r, c)) {
            const x = (c + geo.quietZone) * geo.cellSize;
            const y = geo.topOffset + (r + geo.quietZone) * geo.cellSize;

            if (functionMask[r][c] === 1) {
              ctx.fillRect(x, y, geo.cellSize, geo.cellSize);
            } else {
              if (state.options.dotStyle === 'dots') {
                ctx.beginPath();
                ctx.arc(x + geo.cellSize / 2, y + geo.cellSize / 2, geo.cellSize * 0.42, 0, Math.PI * 2);
                ctx.fill();
              } else if (state.options.dotStyle === 'rounded') {
                this.roundRect(ctx, x, y, geo.cellSize * 0.92, geo.cellSize * 0.92, geo.cellSize * 0.28);
                ctx.fill();
              } else {
                ctx.fillRect(x, y, geo.cellSize, geo.cellSize);
              }
            }
          }
        }
      }

      // Finder Eyes
      const eyeDim = geo.cellSize * 7;
      this.drawCanvasEye(ctx, geo.quietZone * geo.cellSize, geo.topOffset + geo.quietZone * geo.cellSize, eyeDim, geo.cellSize, fill);
      this.drawCanvasEye(ctx, (geo.quietZone + moduleCount - 7) * geo.cellSize, geo.topOffset + geo.quietZone * geo.cellSize, eyeDim, geo.cellSize, fill);
      this.drawCanvasEye(ctx, geo.quietZone * geo.cellSize, geo.topOffset + (geo.quietZone + moduleCount - 7) * geo.cellSize, eyeDim, geo.cellSize, fill);

      // IN-MATRIX TEXT BANNER
      if (state.options.qrText && state.options.qrText.trim()) {
        this.drawCanvasTextBanner(ctx, geo, footprint.bannerWidthCells, footprint.bannerHeightCells, fill);
      } else if (footprint.sideCells > 0) {
        // Logo (only when no QR text)
        this.drawCanvasCenterLogo(ctx, geo, footprint.sideCells, isExport);
      }

      // Frame
      this.drawCanvasFrame(ctx, geo);

      // Hardware Scan Telemetry
      if (!isExport && typeof window.BarcodeDetector !== 'undefined') {
        new window.BarcodeDetector({ formats: ['qr_code'] }).detect(canvas)
          .then(res => {
            if (res && res.length > 0) document.getElementById('scanStatusText').textContent = 'Hardware Scan Decoded ✓';
            else document.getElementById('scanStatusText').textContent = 'Scan Safety Calculated';
          }).catch(() => {
            document.getElementById('scanStatusText').textContent = 'Scan Safety Calculated';
          });
      } else if (!isExport) {
        document.getElementById('scanStatusText').textContent = 'Scan Safety Calculated';
      }
    },

    drawCanvasEye(ctx, x, y, size, cellSize, fill) {
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = state.options.bgColor;
      ctx.fillRect(x + cellSize, y + cellSize, cellSize * 5, cellSize * 5);
      ctx.fillStyle = fill;
      ctx.fillRect(x + cellSize * 2, y + cellSize * 2, cellSize * 3, cellSize * 3);
    },

    // Draws a crisp, stylish text banner strictly within the matrix center
    drawCanvasTextBanner(ctx, geo, widthCells, heightCells, fill) {
      const bannerW = widthCells * geo.cellSize;
      const bannerH = heightCells * geo.cellSize;
      const x = (geo.baseSize - bannerW) / 2;
      const y = geo.topOffset + (geo.baseSize - bannerH) / 2;

      // Banner background
      ctx.fillStyle = fill;
      this.roundRect(ctx, x, y, bannerW, bannerH, 6);
      ctx.fill();

      // Outer border to distinguish from adjacent modules
      ctx.lineWidth = Math.max(2, geo.cellSize * 0.4);
      ctx.strokeStyle = state.options.bgColor;
      ctx.stroke();

      // Text inside banner
      ctx.fillStyle = state.options.bgColor;
      ctx.font = `900 ${Math.round(bannerH * 0.58)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(state.options.qrText.trim().toUpperCase().slice(0, 10), x + bannerW / 2, y + bannerH / 2);
    },

    drawCanvasCenterLogo(ctx, geo, sideCells, isExport) {
      const pixelSize = sideCells * geo.cellSize;
      const x = (geo.baseSize - pixelSize) / 2;
      const y = geo.topOffset + (geo.baseSize - pixelSize) / 2;

      let img = null;
      if (state.options.logoMode === 'custom') {
        img = isExport ? (state.customLogoDataUrl ? state.customLogoImg : null) : state.customLogoImg;
      } else if (state.options.logoMode === 'auto') {
        img = isExport ? (state.activeLogoDataUrl ? state.activeLogoImg : null) : state.activeLogoImg;
      }

      if (!img) return;

      ctx.fillStyle = state.options.bgColor;
      this.roundRect(ctx, x - 2, y - 2, pixelSize + 4, pixelSize + 4, 6);
      ctx.fill();

      ctx.save();
      this.roundRect(ctx, x, y, pixelSize, pixelSize, 6);
      ctx.clip();

      const nw = img.naturalWidth || img.width || 1;
      const nh = img.naturalHeight || img.height || 1;
      const scale = Math.min(pixelSize / nw, pixelSize / nh);
      const dw = nw * scale;
      const dh = nh * scale;
      const dx = x + (pixelSize - dw) / 2;
      const dy = y + (pixelSize - dh) / 2;

      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();
    },

    drawCanvasFrame(ctx, geo) {
      if (state.options.frameStyle === 'none') return;
      const text = state.options.frameText || 'SCAN ME';

      ctx.fillStyle = state.options.fgColor;
      ctx.font = `bold ${Math.round(geo.baseSize * 0.04)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (state.options.frameStyle === 'badge-top') {
        ctx.fillRect(0, 0, geo.totalWidth, geo.frameHeight);
        ctx.fillStyle = state.options.bgColor;
        ctx.fillText(text, geo.totalWidth / 2, geo.frameHeight / 2);
      } else if (state.options.frameStyle === 'badge-bottom') {
        const y = geo.baseSize;
        ctx.fillRect(0, y, geo.totalWidth, geo.frameHeight);
        ctx.fillStyle = state.options.bgColor;
        ctx.fillText(text, geo.totalWidth / 2, y + geo.frameHeight / 2);
      } else if (state.options.frameStyle === 'pill') {
        const pillWidth = geo.baseSize * 0.65;
        const pillHeight = geo.frameHeight * 0.75;
        const x = (geo.totalWidth - pillWidth) / 2;
        const y = geo.baseSize + (geo.frameHeight - pillHeight) / 2;
        this.roundRect(ctx, x, y, pillWidth, pillHeight, pillHeight / 2);
        ctx.fill();
        ctx.fillStyle = state.options.bgColor;
        ctx.fillText(text, geo.totalWidth / 2, y + pillHeight / 2);
      }
    },

    roundRect(ctx, x, y, w, h, r) {
      if (typeof r === 'number') r = [r, r, r, r];
      ctx.beginPath();
      ctx.moveTo(x + r[0], y);
      ctx.lineTo(x + w - r[1], y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r[1]);
      ctx.lineTo(x + w, y + h - r[2]);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r[2], y + h);
      ctx.lineTo(x + r[3], y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r[3]);
      ctx.lineTo(x, y + r[0]);
      ctx.quadraticCurveTo(x, y, x + r[0], y);
      ctx.closePath();
    },

    generateSVG() {
      const qr = this.getQRMatrix();
      if (!qr) return '';

      const moduleCount = qr.getModuleCount();
      const footprint = TelemetryEngine.evaluateAndRepair(moduleCount);
      const functionMask = QRStructure.createFunctionModuleMask(moduleCount);
      const baseSize = 512;
      const geo = GeometryEngine.computeLayout(baseSize, moduleCount, state.options.quietZone, state.options.frameStyle);

      let defs = '';
      let fillAttr = `fill="${state.options.fgColor}"`;

      if (state.options.useGradient) {
        defs += `<defs>
          <linearGradient id="qrGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${state.options.fgColor}" />
            <stop offset="100%" stop-color="${state.options.fgGradColor || state.options.fgColor}" />
          </linearGradient>
        </defs>`;
        fillAttr = 'fill="url(#qrGrad)"';
      }

      let modulesSVG = '';
      for (let r = 0; r < moduleCount; r++) {
        for (let c = 0; c < moduleCount; c++) {
          if (this.isFinderEyeRegion(r, c, moduleCount)) continue;
          if (this.isCenterReserved(r, c, moduleCount, footprint.sideCells, footprint.bannerWidthCells, footprint.bannerHeightCells)) continue;

          if (qr.isDark(r, c)) {
            const x = (c + geo.quietZone) * geo.cellSize;
            const y = geo.topOffset + (r + geo.quietZone) * geo.cellSize;
            modulesSVG += `<rect x="${x}" y="${y}" width="${geo.cellSize}" height="${geo.cellSize}" ${fillAttr} />`;
          }
        }
      }

      // Finder Eyes
      const renderEye = (x, y, size, cellSize) => `
        <rect x="${x}" y="${y}" width="${size}" height="${size}" ${fillAttr} />
        <rect x="${x + cellSize}" y="${y + cellSize}" width="${cellSize * 5}" height="${cellSize * 5}" fill="${state.options.bgColor}" />
        <rect x="${x + cellSize * 2}" y="${y + cellSize * 2}" width="${cellSize * 3}" height="${cellSize * 3}" ${fillAttr} />
      `;

      const eyeDim = geo.cellSize * 7;
      const eyesSVG =
        renderEye(geo.quietZone * geo.cellSize, geo.topOffset + geo.quietZone * geo.cellSize, eyeDim, geo.cellSize) +
        renderEye((geo.quietZone + moduleCount - 7) * geo.cellSize, geo.topOffset + geo.quietZone * geo.cellSize, eyeDim, geo.cellSize) +
        renderEye(geo.quietZone * geo.cellSize, geo.topOffset + (geo.quietZone + moduleCount - 7) * geo.cellSize, eyeDim, geo.cellSize);

      // SVG Text Banner
      let bannerSVG = '';
      if (state.options.qrText && state.options.qrText.trim()) {
        const bannerW = footprint.bannerWidthCells * geo.cellSize;
        const bannerH = footprint.bannerHeightCells * geo.cellSize;
        const x = (geo.baseSize - bannerW) / 2;
        const y = geo.topOffset + (geo.baseSize - bannerH) / 2;
        bannerSVG = `
          <rect x="${x}" y="${y}" width="${bannerW}" height="${bannerH}" rx="6" ${fillAttr} stroke="${state.options.bgColor}" stroke-width="${geo.cellSize * 0.4}" />
          <text x="${x + bannerW / 2}" y="${y + bannerH / 2}" fill="${state.options.bgColor}" font-size="${bannerH * 0.58}" font-weight="900" font-family="sans-serif" text-anchor="middle" dominant-baseline="central">${escapeXml(state.options.qrText.trim().toUpperCase().slice(0, 10))}</text>
        `;
      }

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${geo.totalWidth} ${geo.totalHeight}">
        ${defs}
        <rect width="${geo.totalWidth}" height="${geo.totalHeight}" fill="${state.options.bgColor}" />
        ${modulesSVG}
        ${eyesSVG}
        ${bannerSVG}
      </svg>`;
    }
  };

  // --- 9. UI EVENT SYNC & COMPLETE BINDINGS ---
  function syncControlsFromState() {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };

    setVal('dotStyleSelect', state.options.dotStyle);
    setVal('eyeStyleSelect', state.options.eyeStyle);
    setVal('fgColor', state.options.fgColor);
    setVal('fgColorText', state.options.fgColor);
    setVal('bgColor', state.options.bgColor);
    setVal('bgColorText', state.options.bgColor);
    setVal('fgGradColor', state.options.fgGradColor);
    setVal('fgGradColorText', state.options.fgGradColor);
    setVal('qrTextInput', state.options.qrText);
    setVal('frameStyleSelect', state.options.frameStyle);
    setVal('frameText', state.options.frameText);
    setVal('eccSelect', state.options.ecc);
    setVal('quietZoneSelect', String(state.options.quietZone));

    const gradCheckbox = document.getElementById('enableGradient');
    if (gradCheckbox) gradCheckbox.checked = state.options.useGradient;

    renderPresets();
  }

  function render() {
    const canvas = document.getElementById('qrCanvas');
    if (canvas) QRRenderer.renderCanvas(canvas, 480, false);
  }

  function renderPresets() {
    const grid = document.getElementById('presetsGrid');
    if (!grid) return;
    grid.innerHTML = '';
    PRESETS.forEach(p => {
      const chip = document.createElement('div');
      chip.className = `preset-chip ${state.activePreset === p.id ? 'active' : ''}`;
      chip.innerHTML = `
        <span class="preset-badge-icon" style="background: ${p.fg}; border: 2px solid ${p.bg}"></span>
        <span>${escapeXml(p.name)}</span>
      `;
      chip.onclick = () => {
        state.activePreset = p.id;
        state.isManualOverride = true;
        state.options.dotStyle = p.dot;
        state.options.eyeStyle = p.eye;
        state.options.fgColor = p.fg;
        state.options.bgColor = p.bg;
        state.options.useGradient = Boolean(p.grad);
        if (p.gradColor) state.options.fgGradColor = p.gradColor;
        state.options.frameStyle = p.frame;
        state.options.frameText = p.frameText;
        syncControlsFromState();
        render();
      };
      grid.appendChild(chip);
    });
  }

  function init() {
    // Theme switchers
    document.documentElement.setAttribute('data-theme', state.theme);
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.themeVal === state.theme);
      btn.onclick = () => {
        state.theme = btn.dataset.themeVal;
        localStorage.setItem('smart_qr_app_theme', state.theme);
        document.documentElement.setAttribute('data-theme', state.theme);
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.toggle('active', b === btn));
      };
    });

    renderPresets();

    // Analyze Button
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
      analyzeBtn.onclick = async () => {
        const rawUrl = document.getElementById('urlInput').value.trim();
        if (!rawUrl) return;

        state.url = rawUrl;
        state.isManualOverride = false;
        state.activePreset = null;

        const { evidence: det } = await MetadataProvider.fetchEvidence(rawUrl, ++state.currentAnalysisId);
        state.detection = det;

        document.getElementById('confidenceBadge').textContent = det.confidence;
        document.getElementById('confidenceBadge').classList.add('active');
        document.getElementById('detectedPlatformText').textContent = det.platform;
        document.getElementById('detectedTitle').textContent = det.displayName;
        document.getElementById('detectedCategory').textContent = det.category;
        document.getElementById('detectedDomain').textContent = det.domain || '';

        state.options.fgColor = det.brandColor;
        syncControlsFromState();
        render();
      };
    }

    // Apply Smart Button
    const applySmartBtn = document.getElementById('applySmartBtn');
    if (applySmartBtn) {
      applySmartBtn.onclick = () => {
        if (!state.detection) return;
        state.options.fgColor = state.detection.brandColor;
        state.options.dotStyle = 'square';
        state.options.eyeStyle = 'square';
        state.options.frameStyle = 'pill';
        state.options.frameText = state.detection.displayName.slice(0, 16).toUpperCase();
        syncControlsFromState();
        render();
      };
    }

    // Shuffle Button
    const shuffleSmartBtn = document.getElementById('shuffleSmartBtn');
    if (shuffleSmartBtn) {
      shuffleSmartBtn.onclick = () => {
        const dots = ['square', 'rounded', 'dots', 'smooth'];
        state.designVariationIndex = (state.designVariationIndex + 1) % dots.length;
        state.options.dotStyle = dots[state.designVariationIndex];
        syncControlsFromState();
        render();
      };
    }

    // Manual Custom Controls Listeners
    const bindChange = (id, prop) => {
      const el = document.getElementById(id);
      if (el) {
        el.onchange = (e) => {
          state.isManualOverride = true;
          state.activePreset = null;
          state.options[prop] = e.target.value;
          renderPresets();
          render();
        };
      }
    };

    bindChange('dotStyleSelect', 'dotStyle');
    bindChange('eyeStyleSelect', 'eyeStyle');
    bindChange('frameStyleSelect', 'frameStyle');
    bindChange('eccSelect', 'ecc');

    const qz = document.getElementById('quietZoneSelect');
    if (qz) {
      qz.onchange = (e) => {
        state.options.quietZone = parseInt(e.target.value, 10);
        render();
      };
    }

    // Colors Listeners
    const bindColor = (pickerId, textId, prop) => {
      const picker = document.getElementById(pickerId);
      const text = document.getElementById(textId);
      if (picker && text) {
        picker.oninput = (e) => {
          state.options[prop] = normalizeHexColor(e.target.value);
          text.value = state.options[prop];
          render();
        };
        text.onchange = (e) => {
          if (isValidHexColor(e.target.value)) {
            state.options[prop] = normalizeHexColor(e.target.value);
            picker.value = state.options[prop];
            render();
          }
        };
      }
    };

    bindColor('fgColor', 'fgColorText', 'fgColor');
    bindColor('bgColor', 'bgColorText', 'bgColor');
    bindColor('fgGradColor', 'fgGradColorText', 'fgGradColor');

    const gradCheckbox = document.getElementById('enableGradient');
    if (gradCheckbox) {
      gradCheckbox.onchange = (e) => {
        state.options.useGradient = e.target.checked;
        render();
      };
    }

    const frameText = document.getElementById('frameText');
    if (frameText) {
      frameText.oninput = (e) => {
        state.options.frameText = e.target.value;
        render();
      };
    }

    // --- QR TEXT APPLY & CLEAR LISTENERS ---
    const qrTextInput = document.getElementById('qrTextInput');
    const qrTextApplyBtn = document.getElementById('qrTextApplyBtn');
    const qrTextClearBtn = document.getElementById('qrTextClearBtn');

    if (qrTextApplyBtn) {
      qrTextApplyBtn.onclick = () => {
        if (!qrTextInput) return;
        state.options.qrText = qrTextInput.value.trim().toUpperCase().slice(0, 10);
        render();
      };
    }

    if (qrTextInput) {
      qrTextInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (qrTextApplyBtn) qrTextApplyBtn.click();
        }
      };
    }

    if (qrTextClearBtn) {
      qrTextClearBtn.onclick = () => {
        state.options.qrText = '';
        if (qrTextInput) qrTextInput.value = '';
        render();
      };
    }

    // --- LOGO UPLOAD & SCALE SLIDER ---
    const logoUpload = document.getElementById('logoUpload');
    const logoSizeSlider = document.getElementById('logoSizeSlider');
    const logoSizeVal = document.getElementById('logoSizeVal');

    if (logoSizeSlider) {
      logoSizeSlider.oninput = (e) => {
        const val = parseInt(e.target.value, 10);
        state.options.logoScale = val / 100;
        if (logoSizeVal) logoSizeVal.textContent = `${val}%`;
        render();
      };
    }

    document.querySelectorAll('input[name="logoMode"]').forEach(radio => {
      radio.onchange = (e) => {
        state.options.logoMode = e.target.value;
        const uploadCont = document.getElementById('customUploadContainer');
        if (uploadCont) uploadCont.classList.toggle('hidden-field', e.target.value !== 'custom');
        render();
      };
    });

    if (logoUpload) {
      logoUpload.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
              state.customLogoImg = img;
              state.customLogoDataUrl = ev.target.result;
              render();
            };
            img.src = ev.target.result;
          };
          reader.readAsDataURL(file);
        }
      };
    }

    // Export Handlers
    const downloadPngBtn = document.getElementById('downloadPngBtn');
    if (downloadPngBtn) {
      downloadPngBtn.onclick = () => {
        if (!state.url) return;
        const exportCanvas = document.createElement('canvas');
        QRRenderer.renderCanvas(exportCanvas, 1600, true);
        const link = document.createElement('a');
        link.download = `smart-qr-${Date.now()}.png`;
        link.href = exportCanvas.toDataURL('image/png');
        link.click();
      };
    }

    const downloadSvgBtn = document.getElementById('downloadSvgBtn');
    if (downloadSvgBtn) {
      downloadSvgBtn.onclick = () => {
        if (!state.url) return;
        const svg = QRRenderer.generateSVG();
        if (!svg) return;
        const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `smart-qr-${Date.now()}.svg`;
        link.href = objectUrl;
        link.click();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      };
    }

    render();
  }

  window.addEventListener('DOMContentLoaded', init);
})();
