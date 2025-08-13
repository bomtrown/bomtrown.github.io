// ===== DOM REFERENCES =====
const canvas = document.getElementById('preview');
const asciiImage = document.getElementById('ascii');
const context = canvas.getContext('2d');
const image = document.getElementById('sourceImage'); // Preloaded HTML image

// ===== GRAYSCALE CONVERSION =====
const toGrayScale = (r, g, b) => 0.21 * r + 0.72 * g + 0.07 * b;

const getFontRatio = () => {
    const pre = document.createElement('pre');
    pre.style.display = 'inline';
    pre.textContent = ' ';
    document.body.appendChild(pre);
    const { width, height } = pre.getBoundingClientRect();
    document.body.removeChild(pre);
    return height / width;
};

const fontRatio = getFontRatio();

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
        imageData.data[i] = imageData.data[i + 1] = imageData.data[i + 2] = grayScale;
        grayScales.push(grayScale);
    }

    context.putImageData(imageData, 0, 0);
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
//const grayRamp = '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/|()1{}[]?-_+~<>i!lI;:,"^`\'. ';
const grayRamp = "  .:=+-#*%@";
const rampLength = grayRamp.length;
const getCharacterForGrayScale = grayScale => grayRamp[Math.ceil((rampLength - 1) * grayScale / 255)];

const drawAscii = (grayScales, width) => {
    const ascii = grayScales.reduce((asciiStr, grayScale, index) => {
        let nextChars = getCharacterForGrayScale(grayScale);
        if ((index + 1) % width === 0) nextChars += '\n';
        return asciiStr + nextChars;
    }, '');
    asciiImage.textContent = ascii;
};

// ===== REDRAW FUNCTION =====
const redrawAscii = () => {
    const [width, height] = clampDimensions(image.naturalWidth, image.naturalHeight);
    canvas.width = width;
    canvas.height = height;
    context.drawImage(image, 0, 0, width, height);
    const grayScales = convertToGrayScales(context, width, height);
    drawAscii(grayScales, width);
};

// ===== RUN ON LOAD =====
window.addEventListener('load', () => {
    if (image.naturalWidth === 0 || image.naturalHeight === 0) {
        console.error('Preloaded image has invalid dimensions.');
        asciiImage.textContent = 'Error: Image not found or invalid dimensions.';
        return;
    }
    redrawAscii();
    window.addEventListener('scroll', redrawAscii); // Optional: redraw on scroll
});