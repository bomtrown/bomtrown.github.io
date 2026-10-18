const preloaderHeader = document.querySelector('#preloader-text');

// 1. SPLIT TEXT INTO SPANS (Identical architecture to name-jitter.js)
if (preloaderHeader && !preloaderHeader.dataset.split) {
  const nodes = Array.from(preloaderHeader.childNodes);
  const newNodes = [];
  let lineIndex = 0;
  let localIndex = 0;

  nodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim(); 
      if (text === '') return; 

      const letters = text.split('');
      letters.forEach(letter => {
        const span = document.createElement('span');
        span.textContent = letter;
        span.dataset.char = letter;
        span.dataset.line = lineIndex;
        span.dataset.localIndex = localIndex;
        
        if (letter === ' ') span.style.whiteSpace = 'pre'; 
        
        newNodes.push(span);
        localIndex++;
      });
    } else if (node.nodeName === 'BR') {
      newNodes.push(document.createElement('br'));
      lineIndex++;
      localIndex = 0;
    } else {
      newNodes.push(node.cloneNode(true));
    }
  });

  preloaderHeader.innerHTML = '';
  newNodes.forEach(n => preloaderHeader.appendChild(n));
  preloaderHeader.dataset.split = 'true';
}

// Pseudo-random noise function
function fakeNoise(x) {
  const value = Math.sin(x) + 0.5 * Math.sin(2.3 * x + 1.1);
  return 0.5 * (value / 1.5) + 0.5;
}

// 2. VIRTUAL DOM CACHING
const preloaderSpans = preloaderHeader ? preloaderHeader.querySelectorAll('span') : [];
const preloaderStates = Array.from(preloaderSpans).map((span, index) => ({
  element: span,
  lineIdx: parseInt(span.dataset.line),
  localIdx: parseInt(span.dataset.localIndex),
  originalChar: span.dataset.char,
  indexNoise: fakeNoise(index * 10),
  
  // Trackers to prevent layout thrashing
  currentText: span.textContent,
  currentColor: '',
  currentBg: ''
}));

let preloaderStart = null;

// 3. THE TIME-BASED ANIMATION LOOP
function animatePreloader(currentTime) {
  // Graceful shutdown: Stop animating once the preloader is removed from the DOM by base.html
  if (!document.getElementById('preloader-text')) return; 

  if (!preloaderStart) preloaderStart = currentTime;
  const elapsed = currentTime - preloaderStart;
  
  // Sweep Configuration: 1.8 seconds per right-to-left sweep
  const loopDuration = 1800; 
  const progress = (elapsed % loopDuration) / loopDuration;
  
  // Math for the 30° Right-To-Left Sweep
  // Sweep 'X' drops from 12 down to -6 so it completely clears the bounding box cleanly.
  const sweepX = 12 - (progress * 18);
  const sweepWidth = 4; // Controls the horizontal thickness of the glitch band

  preloaderStates.forEach((state) => {
    // Shifting lines by 0.8 characters per row tilts the sweep line to ~30° (\)
    const effectiveX = state.localIdx - (state.lineIdx * 0.8);
    const distanceToSweep = Math.abs(sweepX - effectiveX);
    
    let newText = state.originalChar;
    let newColor = '';
    let newBg = '';
    
    // If the character is caught inside the sweeping glitch band...
    if (distanceToSweep < sweepWidth) {
      // Intensity is highest (1.0) perfectly on the sweep line, fading to 0 at the edges
      const intensity = 1 - (distanceToSweep / sweepWidth);
      
      // FIX: Removed 'elapsed'. The seed is now strictly tied to the letter's static position.
      // This guarantees zero frame-by-frame strobing.
      const staticSeed = state.indexNoise * 100;
      
      // Combine the smooth sweep intensity with the letter's static noise
      if ((fakeNoise(staticSeed) * 0.4 + intensity) > 0.8) {
        
        // 1. CHARACTER GLITCH (Stable while lit, won't flip rapidly)
        if (fakeNoise(staticSeed + 42) < 0.25) {
          const glitchChars = ['@', '#', '%', '&', '*', '~', '?', 'X', '+', '>', '0', '1'];
          newText = glitchChars[Math.floor(fakeNoise(staticSeed * 1.5) * glitchChars.length)];
        }
        
        // 2. BRAND COLOR (Locked to the specific letter, won't flash between colors)
        const hexColors = ['#B05F0F', '#E02525', '#FECE08', '#04783F', '#EE9BAC', '#7B848B', '#861A54', '#231F20', '#1B3F94', '#0C9FDC', '#6DC7B0'];
        newColor = hexColors[Math.floor(fakeNoise(staticSeed * 2) * hexColors.length)];
        
        // 3. RARE INVERT (Locked to the letter)
        if (fakeNoise(staticSeed + 100) < 0.2) {
          newBg = 'black';
          newColor = 'white';
        }
      }
    }
    
    // 4. BATCH DOM WRITES
    // Bypasses the browser's style recalculation unless something strictly changed
    if (state.currentText !== newText) {
      state.element.textContent = newText;
      state.currentText = newText;
    }
    if (state.currentColor !== newColor) {
      state.element.style.color = newColor;
      state.currentColor = newColor;
    }
    if (state.currentBg !== newBg) {
      state.element.style.backgroundColor = newBg;
      state.currentBg = newBg;
    }
  });
  
  // Call next frame
  requestAnimationFrame(animatePreloader);
}

// Fire the loop if the preloader exists on load
if (preloaderHeader) {
  requestAnimationFrame(animatePreloader);
}