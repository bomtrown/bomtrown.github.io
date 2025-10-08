// Simple Perlin noise implementation
function perlin(x) {
    return (Math.sin(x * 2.1) + Math.sin(x * 0.7 + 1.3)) / 2 + 0.5;
}

// ASCII characters from dark to light
const asciiChars = "@%#*+=-:. ";

function imageToAscii(img, width = 80) {
    // Ensure image has valid dimensions
    if (
        !img.naturalWidth ||
        !img.naturalHeight ||
        img.naturalWidth === 0 ||
        img.naturalHeight === 0
    ) {
        return '';
    }
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const aspect = img.naturalHeight / img.naturalWidth;
    canvas.width = width;
    canvas.height = Math.max(1, Math.round(width * aspect * 0.5)); // 0.5 for font aspect ratio, min 1

    // Prevent errors if canvas has zero width or height
    if (canvas.width === 0 || canvas.height === 0) {
        return '';
    }

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    let data;
    try {
        data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    } catch (e) {
        return '';
    }
    let ascii = '';
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4;
            const avg = (data[i] + data[i+1] + data[i+2]) / 3;
            const charIdx = Math.floor((avg / 255) * (asciiChars.length - 1));
            ascii += asciiChars[charIdx];
        }
        ascii += '\n';
    }
    return ascii;
}

function asciifyImage(img) {
    // Ensure image is loaded
    if (!img.complete || img.naturalWidth === 0) {
        img.addEventListener('load', () => asciifyImage(img), { once: true });
        return;
    }

    // Hide original image
    img.style.visibility = 'hidden';

    // Create overlay
    const pre = document.createElement('pre');
    pre.style.position = 'absolute';
    pre.style.left = img.offsetLeft + 'px';
    pre.style.top = img.offsetTop + 'px';
    pre.style.width = img.width + 'px';
    pre.style.height = img.height + 'px';
    pre.style.fontFamily = 'monospace';
    pre.style.fontSize = '8px';
    pre.style.lineHeight = '6px';
    pre.style.pointerEvents = 'none';
    pre.style.margin = '0';
    pre.style.whiteSpace = 'pre';
    pre.style.zIndex = 10;
    pre.style.color = '#000';

    // Generate ASCII
    pre.textContent = imageToAscii(img, 80);

    // Insert or update overlay
    if (img._asciiOverlay && img._asciiOverlay.parentNode) {
        img._asciiOverlay.textContent = pre.textContent;
        // Update position and size in case image moved/resized
        img._asciiOverlay.style.left = img.offsetLeft + 'px';
        img._asciiOverlay.style.top = img.offsetTop + 'px';
        img._asciiOverlay.style.width = img.width + 'px';
        img._asciiOverlay.style.height = img.height + 'px';
    } else {
        img.parentNode.insertBefore(pre, img.nextSibling);
        img._asciiOverlay = pre;
    }
}

function updateEffects() {
    const images = document.querySelectorAll('img.asciify');
    images.forEach(img => {
        const rect = img.getBoundingClientRect();
        // 1. Fade in from white
        //let fade = Math.min(1, Math.max(0, rect.bottom / window.innerHeight));
        //img.style.filter = `brightness(1)`;
        //img.style.transition = 'filter 0.2s, opacity 0.2s';
        //img.style.opacity = 1 - fade;
        //img.style.background = `rgba(255,255,255,${fade})`;

        // 2. Perlin noise brightness
        //const scrollY = window.scrollY || window.pageYOffset;
        //const noise = perlin(scrollY * 0.002 + rect.left * 0.01);
        //img.style.filter = `brightness(${0.7 + noise * 0.6})`;

        // 3. ASCII overlay
        asciifyImage(img);
    });
}

window.addEventListener('scroll', updateEffects);
window.addEventListener('resize', updateEffects);
window.addEventListener('DOMContentLoaded', () => {
    updateEffects();
});