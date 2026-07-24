// ===== DOM REFERENCES =====
const hiddenCanvas = document.getElementById('preview');
const hiddenContext = hiddenCanvas.getContext('2d');
const image = document.getElementById('sourceImage'); // Preloaded HTML image

// Identify the old, slow <pre> element
const preElement = document.getElementById('ascii');

// Create the new hardware-accelerated rendering surface
const renderCanvas = document.createElement('canvas');
renderCanvas.id = preElement ? preElement.id : 'ascii'; 
if (preElement) {
    // Inherit classes and swap it into the DOM instantly
    renderCanvas.className = preElement.className;
    preElement.parentNode.replaceChild(renderCanvas, preElement);
} else {
    document.body.appendChild(renderCanvas);
}

const renderContext = renderCanvas.getContext('2d');

// ===== GRAYSCALE CONVERSION =====
const toGrayScale = (r, g, b) => 0.21 * r + 0.72 * g + 0.07 * b;

let fontRatio = 1; // Will be calculated dynamically

const getFontRatio = () => {
    const pre = document.createElement('pre');
    pre.style.display = 'inline';
    // Match the CSS font exactly to get an accurate ratio
    pre.style.fontFamily = '"Avenir Next Condensed", Avenir, sans-serif'; 
    pre.style.fontSize = '1vw';
    pre.textContent = ' ';
    document.body.appendChild(pre);
    const { width, height } = pre.getBoundingClientRect();
    document.body.removeChild(pre);
    return height / width;
};

const convertToGrayScales = (context, width, height) => {
    let imageData;
    try {
        imageData = context.getImageData(0, 0, width, height);
    } catch (err) {
        console.error("getImageData failed:", err.name, err.message);
        return [];
    }

    const grayScales = [];
    for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        const grayScale = toGrayScale(r, g, b);
        grayScales.push(grayScale);
    }
    return grayScales;
};

// ===== DIMENSIONS =====
const MAXIMUM_WIDTH = 80;
const MAXIMUM_HEIGHT = 80;

const clampDimensions = (width, height) => {
    const rectifiedWidth = Math.floor(fontRatio * width);
    if (height > MAXIMUM_HEIGHT) {
        const reducedWidth = Math.floor(rectifiedWidth * MAXIMUM_HEIGHT / height);
        return [Math.max(1, reducedWidth), MAXIMUM_HEIGHT];
    }
    if (width > MAXIMUM_WIDTH) {
        const reducedHeight = Math.floor(height * MAXIMUM_WIDTH / rectifiedWidth);
        return [MAXIMUM_WIDTH, Math.max(1, reducedHeight)];
    }
    return [Math.max(1, rectifiedWidth), Math.max(1, height)];
};

// ===== ASCII CHARACTERS =====
const grayRamp = "  .:=+-#*%@";
const rampLength = grayRamp.length;
const getCharacterForGrayScale = grayScale => grayRamp[Math.ceil((rampLength - 1) * (grayScale) / 255)];

// GLOBALS FOR CACHING
let cachedGrayScales = [];
let cachedWidth = 0;
let cachedHeight = 0;
let cachedLineHeight = 10;

// Sizes the render canvas perfectly to match the 1vw CSS rule while staying crisp
function setupCanvasSizing(cols, rows) {
    const vw = window.innerWidth * 0.01;
    const fontSize = vw; 
    const fontStyle = `100 ${fontSize}px "Avenir Next Condensed", Avenir, sans-serif`;
    
    renderContext.font = fontStyle;
    // Overestimate char width slightly with 'W' so rows don't clip on the right side
    const charWidth = renderContext.measureText("W").width || (fontSize * 0.6); 
    const charHeight = fontSize; // Equivalent to line-height: 1
    
    // Scale for Retina/High-DPI displays so the text doesn't blur
    const dpr = window.devicePixelRatio || 1;
    
    const cssWidth = charWidth * cols;
    const cssHeight = charHeight * rows;
    
    renderCanvas.width = cssWidth * dpr;
    renderCanvas.height = cssHeight * dpr;
    renderCanvas.style.width = `${cssWidth}px`;
    renderCanvas.style.height = `${cssHeight}px`;
    
    renderContext.scale(dpr, dpr);
    
    // Setting canvas dimensions resets context state, so we must re-apply the styling
    renderContext.font = fontStyle;
    renderContext.fillStyle = "rgb(0, 0, 0)"; 
    renderContext.textBaseline = "top";
    
    return charHeight;
}

// Run this ONCE to cache the expensive pixel extraction
const cacheImageData = () => {
    const [width, height] = clampDimensions(image.naturalWidth, image.naturalHeight);
    hiddenCanvas.width = width;
    hiddenCanvas.height = height;
    hiddenContext.drawImage(image, 0, 0, width, height);
    
    cachedGrayScales = convertToGrayScales(hiddenContext, width, height);
    cachedWidth = width;
    cachedHeight = height;
    
    cachedLineHeight = setupCanvasSizing(cachedWidth, cachedHeight);
};

// This completely skips the DOM. It draws batches of text strings to the GPU.
const redrawAscii = (easedScrollY) => {
    if (!cachedGrayScales.length) return;

    const maxScroll = Math.max(document.body.scrollHeight - window.innerHeight, 1);
    const scrollProgress = maxScroll > 0 ? (easedScrollY / maxScroll) : 0;
    const brightness = scrollProgress * 15; 

    // Wipe the previous frame clean
    renderContext.clearRect(0, 0, renderCanvas.width, renderCanvas.height);

    let rowString = "";
    let rowIndex = 0;

    for (let i = 0; i < cachedGrayScales.length; i++) {
        const adjustedGray = Math.min(255, Math.max(0, cachedGrayScales[i] * brightness));
        rowString += getCharacterForGrayScale(adjustedGray);
        
        // If we've reached the end of the row, draw the whole string at once
        if ((i + 1) % cachedWidth === 0) {
            renderContext.fillText(rowString, 0, rowIndex * cachedLineHeight);
            rowString = "";
            rowIndex++;
        }
    }
};

// ===== SMOOTH SCROLL EASING (LERP) =====
let targetScrollY = window.scrollY || window.pageYOffset;
let currentScrollY = targetScrollY;
let isAnimating = false;

const updateAsciiAnimation = () => {
    currentScrollY += (targetScrollY - currentScrollY) * 0.05;

    if (Math.abs(targetScrollY - currentScrollY) < 0.5) {
        currentScrollY = targetScrollY;
        redrawAscii(currentScrollY);
        isAnimating = false;
        return;
    }

    redrawAscii(currentScrollY);
    window.requestAnimationFrame(updateAsciiAnimation);
};

window.addEventListener('scroll', () => {
    targetScrollY = window.scrollY || window.pageYOffset;
    if (!isAnimating) {
        isAnimating = true;
        window.requestAnimationFrame(updateAsciiAnimation);
    }
});

// If the user resizes the window, scale the text to match
window.addEventListener('resize', () => {
    if (cachedWidth && cachedHeight) {
        cachedLineHeight = setupCanvasSizing(cachedWidth, cachedHeight);
        redrawAscii(currentScrollY);
    }
});

// ===== RUN ON LOAD =====
window.addEventListener('load', () => {
    if (!image || image.naturalWidth === 0 || image.naturalHeight === 0) {
        console.error('Preloaded image has invalid dimensions.');
        return;
    }
    
    fontRatio = getFontRatio();
    cacheImageData();
    
    targetScrollY = window.scrollY || window.pageYOffset;
    currentScrollY = targetScrollY;
    redrawAscii(currentScrollY);
});