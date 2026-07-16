/* Shared canvas plumbing for the exhibits: DPR-aware sizing and
   a paper-with-halftone backdrop every game prints onto. */

export function fitCanvas(canvas, stage) {
  const ctx = canvas.getContext('2d');
  const state = { w: 0, h: 0, dpr: 1 };

  function resize() {
    state.dpr = Math.min(devicePixelRatio || 1, 2);
    state.w = stage.clientWidth;
    state.h = stage.clientHeight;
    canvas.width = Math.round(state.w * state.dpr);
    canvas.height = Math.round(state.h * state.dpr);
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(stage);

  return {
    ctx,
    state,
    resize,
    destroy: () => ro.disconnect(),
  };
}

/** Faint printed-field backdrop: halftone tint + margin rule. */
export function paintField(ctx, w, h, inkHex, alpha = 0.12) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = inkHex;
  const step = 26;
  for (let y = step / 2; y < h; y += step) {
    for (let x = step / 2; x < w; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
