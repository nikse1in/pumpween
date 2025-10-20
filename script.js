// $PUMPWEEN PFP Maker — drag the hat, not the image
// Save your pumpkin art as "mask.png" in the same folder.

const canvas = document.getElementById('editor');
const ctx = canvas.getContext('2d', { alpha: true });

const fileInput = document.getElementById('fileInput');
const scaleRange = document.getElementById('scaleRange');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');

const caInput = document.getElementById('caInput');
const copyCA = document.getElementById('copyCA');

const shareXBtn = document.getElementById('shareX');

canvas.width = 600;
canvas.height = 600;

// Images
let userImg = new Image();
let maskImg = new Image();
maskImg.src = 'mask.png'; // ensure present

// State
let state = {
  imgLoaded: false,
  maskReady: false,

  // user image fixed to cover canvas
  imgNaturalW: 0,
  imgNaturalH: 0,

  // draggable mask settings
  maskScale: 1,
  maskOffsetX: 0,
  maskOffsetY: 0,

  draggingMask: false,
  dragStartX: 0,
  dragStartY: 0
};

function clearCanvas(){ ctx.clearRect(0,0,canvas.width,canvas.height); }

function render(){
  clearCanvas();

  // Preview background
  ctx.save();
  ctx.fillStyle = '#0a0e16';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.restore();

  // Draw user image centered, cover
  if (state.imgLoaded){
    const baseScale = Math.max(canvas.width / state.imgNaturalW, canvas.height / state.imgNaturalH);
    const drawW = state.imgNaturalW * baseScale;
    const drawH = state.imgNaturalH * baseScale;
    const x = (canvas.width - drawW) / 2;
    const y = (canvas.height - drawH) / 2;
    ctx.drawImage(userImg, x, y, drawW, drawH);
  } else {
    ctx.save();
    ctx.fillStyle = '#8ea7bd';
    ctx.font = '16px Inter, system-ui, Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Upload a PFP image to begin', canvas.width/2, canvas.height/2);
    ctx.restore();
  }

  // Draw mask on top, positioned by user
  if (state.maskReady){
    const mw = maskImg.naturalWidth;
    const mh = maskImg.naturalHeight;

    const base = Math.min(canvas.width / mw, canvas.height / mh);
    const scale = base * state.maskScale;
    const drawW = mw * scale;
    const drawH = mh * scale;

    const centerX = canvas.width / 2 + state.maskOffsetX;
    const centerY = canvas.height / 2 + state.maskOffsetY;

    const x = centerX - drawW / 2;
    const y = centerY - drawH / 2;

    ctx.drawImage(maskImg, x, y, drawW, drawH);
  }
}

function recenterMask(){
  state.maskOffsetX = 0;
  state.maskOffsetY = 0;
  state.maskScale = 1;
  scaleRange.value = 1;
}

// Load user image
fileInput.addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const url = URL.createObjectURL(f);

  userImg = new Image();
  userImg.crossOrigin = 'anonymous';
  userImg.onload = () => {
    state.imgNaturalW = userImg.naturalWidth;
    state.imgNaturalH = userImg.naturalHeight;
    state.imgLoaded = true;
    downloadBtn.disabled = false;
    render();
  };
  userImg.onerror = () => alert('Failed to load image.');
  userImg.src = url;
});

// Load mask and preprocess (convert near-black to transparent if needed)
maskImg.crossOrigin = 'anonymous';
maskImg.onload = () => {
  state.maskReady = true;

  const tmp = document.createElement('canvas');
  tmp.width = maskImg.naturalWidth;
  tmp.height = maskImg.naturalHeight;
  const tctx = tmp.getContext('2d');
  tctx.drawImage(maskImg, 0, 0);
  const data = tctx.getImageData(0,0,tmp.width,tmp.height);
  let hasAlpha = false;
  for (let i=0;i<data.data.length;i+=4){
    if (data.data[i+3] < 255) { hasAlpha = true; break; }
  }
  if (!hasAlpha){
    for (let i=0;i<data.data.length;i+=4){
      const r = data.data[i], g = data.data[i+1], b = data.data[i+2];
      const lum = 0.299*r + 0.587*g + 0.114*b;
      if (lum < 30){ data.data[i+3] = 0; }
    }
    tctx.putImageData(data,0,0);
    const processed = new Image();
    processed.onload = () => { maskImg = processed; render(); };
    processed.src = tmp.toDataURL('image/png');
  } else {
    render();
  }
};

// Drag to move the mask
canvas.addEventListener('pointerdown', (e) => {
  state.draggingMask = true;
  state.dragStartX = e.clientX;
  state.dragStartY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
  canvas.style.cursor = 'grabbing';
});
canvas.addEventListener('pointermove', (e) => {
  if (!state.draggingMask) return;
  const dx = e.clientX - state.dragStartX;
  const dy = e.clientY - state.dragStartY;
  state.dragStartX = e.clientX;
  state.dragStartY = e.clientY;
  state.maskOffsetX += dx;
  state.maskOffsetY += dy;
  render();
});
canvas.addEventListener('pointerup', (e) => {
  state.draggingMask = false;
  canvas.releasePointerCapture(e.pointerId);
  canvas.style.cursor = 'grab';
});
canvas.addEventListener('pointerleave', () => {
  state.draggingMask = false;
  canvas.style.cursor = 'grab';
});
canvas.addEventListener('dblclick', () => { recenterMask(); render(); });

scaleRange.addEventListener('input', (e) => {
  state.maskScale = parseFloat(e.target.value);
  render();
});

// Download result
downloadBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'pumpween_pfp.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});

// Reset hat
resetBtn.addEventListener('click', () => { recenterMask(); render(); });

// Copy CA
copyCA.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(caInput.value || '');
    copyCA.textContent = 'Copied!';
    setTimeout(()=> copyCA.textContent = 'Copy', 1200);
  } catch (e) {
    alert('Copy failed — select & Ctrl/Cmd+C');
  }
});

// Share on X (text intent; user attaches the downloaded PNG manually)
shareXBtn.addEventListener('click', async () => {
  // Trigger a quick download so user has the image
  const link = document.createElement('a');
  link.download = 'pumpween_pfp.png';
  link.href = canvas.toDataURL('image/png');
  link.click();

  const message = "I just joined $PUMPWEEN pfp cult its your turn too!";
  const site = window.location.origin + window.location.pathname;
  const text = `${message} ${site}`;
  const intentUrl = `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
  window.open(intentUrl, '_blank', 'noopener');
});

// Initial paint
render();
