const header = document.querySelector('h1.jitter');

// Splits the text into individual span tags so they can be manipulated
if (!header.dataset.split) {
  const nodes = Array.from(header.childNodes);
  const newNodes = [];
  let lineIndex = 0;
  let localIndex = 0;

  nodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      // Clean up stray newlines AND HTML indentation so they don't break our counts
      const text = node.textContent.trim(); 
      if (text === '') return; 

      const letters = text.split('');
      letters.forEach(letter => {
        const span = document.createElement('span');
        span.textContent = letter;
        span.dataset.char = letter; // Original character
        span.dataset.line = lineIndex; // Track which of the 5 lines this is on
        span.dataset.localIndex = localIndex; // Track the character's position in this specific line
        
        // Ensure spaces don't collapse now that they are in spans
        if (letter === ' ') span.style.whiteSpace = 'pre'; 
        
        newNodes.push(span);
        localIndex++;
      });
    } else if (node.nodeName === 'BR') {
      newNodes.push(document.createElement('br'));
      lineIndex++;
      localIndex = 0; // Reset index for the next line
    } else {
      newNodes.push(node.cloneNode(true));
    }
  });

  header.innerHTML = '';
  newNodes.forEach(n => header.appendChild(n));
  header.dataset.split = 'true';
}

// Pseudo-random noise function
// OPTIMIZED: Reduced from 5 Math.sin() calls to 2, saving thousands of operations per frame
function fakeNoise(x) {
  const value = Math.sin(x) + 0.5 * Math.sin(2.3 * x + 1.1);
  return 0.5 * (value / 1.5) + 0.5;
}

// Linear Interpolation
function lerp(start, end, progress) {
  return start + (end - start) * progress;
}

const spans = header.querySelectorAll('span');
let isJitterTicking = false;

// VIRTUAL DOM CACHING: Prevents layout thrashing by storing state and pre-computing static math
const spanStates = Array.from(spans).map((span, index) => ({
  element: span,
  lineIdx: parseInt(span.dataset.line),
  localIdx: parseInt(span.dataset.localIndex),
  originalChar: span.dataset.char,
  
  // Pre-calculate noise that relies only on the index, removing it from the scroll loop
  morphThreshold: fakeNoise(index * 21),
  disappearThreshold: fakeNoise(index * 13),
  indexNoise: fakeNoise(index),
  
  // Virtual DOM trackers for the current frame state
  currentText: span.textContent,
  currentOpacity: '1',
  currentColor: '',
  currentBg: ''
}));

window.addEventListener('scroll', () => {
  if (!isJitterTicking) {
    window.requestAnimationFrame(() => {
      const scrollTop = window.scrollY;
      const vh = window.innerHeight;
      const maxScroll = Math.max(document.body.scrollHeight - vh, 1);
      const startFadeIn = Math.max(vh * 1.5, maxScroll - vh * 0.4);

      // === THE TIMELINE ===
      // Note: "PROJECTS " has a space at the end to match the 9 characters of "TOM BROWN"
      const timeline = [
        { scroll: 0,           jitter: 0,   whiteout: 0,   morph: 0, centerFade: 0, string: "TOM BROWN" },
        { scroll: vh * 0.4,    jitter: 0.7, whiteout: 0,   morph: 0, centerFade: 0, string: "TOM BROWN" },
        { scroll: vh * 0.7,    jitter: 0,   whiteout: 0,   morph: 1, centerFade: 0, string: "PROJECTS " },
        { scroll: vh * 1.0,    jitter: 0,   whiteout: 1.0, morph: 1, centerFade: 0, string: "PROJECTS " },
        { scroll: vh * 1.5,    jitter: 0.5, whiteout: 1,   morph: 1, centerFade: 1, string: "PROJECTS " },
        { scroll: startFadeIn, jitter: 1,   whiteout: 1,   morph: 0, centerFade: 1, string: "TOM BROWN" },
        { scroll: maxScroll,   jitter: 0,   whiteout: 1,   morph: 1, centerFade: 0, string: "CONTACTS  " }
      ];

      // === FIND CURRENT KEYFRAME & LERP WEIGHTS ===
      let currentJitter = 1;
      let currentWhiteout = 0;
      let currentMorph = 0;
      let currentCenterFade = 0;
      let currentString = "TOM BROWN";

      if (scrollTop <= timeline[0].scroll) {
        currentJitter = timeline[0].jitter;
        currentWhiteout = timeline[0].whiteout;
        currentMorph = timeline[0].morph;
        currentCenterFade = timeline[0].centerFade;
        currentString = timeline[0].string;
      } else if (scrollTop >= timeline[timeline.length - 1].scroll) {
        currentJitter = timeline[timeline.length - 1].jitter;
        currentWhiteout = timeline[timeline.length - 1].whiteout;
        currentMorph = timeline[timeline.length - 1].morph;
        currentCenterFade = timeline[timeline.length - 1].centerFade;
        currentString = timeline[timeline.length - 1].string;
      } else {
        for (let i = 0; i < timeline.length - 1; i++) {
          const start = timeline[i];
          const end = timeline[i + 1];
          if (scrollTop >= start.scroll && scrollTop <= end.scroll) {
            const progress = (scrollTop - start.scroll) / (end.scroll - start.scroll);
            currentJitter = lerp(start.jitter, end.jitter, progress);
            currentWhiteout = lerp(start.whiteout, end.whiteout, progress);
            currentMorph = lerp(start.morph, end.morph, progress);
            currentCenterFade = lerp(start.centerFade, end.centerFade, progress);
            
            // Strings don't lerp gracefully, so we grab the destination string
            currentString = end.string;
            break;
          }
        }
      }

      const targetChars = currentString.split('');

      // === APPLY EFFECTS ===
      spanStates.forEach((state) => {
        // 1. MORPH LOGIC (Center line only)
        let displayChar = state.originalChar;
        if (state.lineIdx === 2) { 
            if (currentMorph > state.morphThreshold) {
                // Swap to the target character, fallback to space if the target string is shorter
                displayChar = targetChars[state.localIdx] || ' '; 
            }
        }

        // 2. WHITEOUT / DISAPPEAR LOGIC
        // Use centerFade for the middle line (index 2), and whiteout for all others
        let effectiveWhiteout = (state.lineIdx === 2) ? currentCenterFade : currentWhiteout;

        if (effectiveWhiteout > state.disappearThreshold) {
          if (state.currentOpacity !== '0') {
            state.element.style.opacity = '0';
            state.currentOpacity = '0';
          }
          return; // Skip rendering glitch math if the letter is invisible
        } else {
          if (state.currentOpacity !== '1') {
            state.element.style.opacity = '1';
            state.currentOpacity = '1';
          }
        }

        const blipSeed = (scrollTop + state.indexNoise * 1000) / 100;
        const weight = currentJitter;
        let newText = displayChar;
        let newColor = '';
        let newBg = '';

        // 3. CHARACTER FLICKER
        if (fakeNoise(blipSeed) < weight * 0.5) {
          const glitchChars = ['@', '#', '%', '&', '*', '~', '?'];
          newText = glitchChars[Math.floor(state.indexNoise * glitchChars.length)];
        }

        // 4. TEXT COLOUR
        if (fakeNoise(blipSeed) < weight * 0.5) {
          const hues = [0, 50, 210];
          const hue = hues[Math.floor(state.indexNoise * hues.length)];
          newColor = `hsl(${hue}, 90%, 60%)`;
        } else {
          const lightness = (Math.sin(blipSeed / 2) + 1) * 5;
          // Math.round limits micro-changes that trigger sub-pixel browser repaints
          newColor = `hsl(0, 0%, ${Math.round(lightness * 10) / 10}%)`;
        }

        // 5. BACKGROUND COLOUR
        if (fakeNoise(blipSeed + 2356) < weight * 0.5) {
          newBg = 'black';
          newColor = 'white';
        } else {
          newBg = 'var(--bg-color)';
        }

        // --- BATCH DOM WRITES ---
        // Crucial: Only mutate the DOM if the value ACTUALLY changed from the cache
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
      
      isJitterTicking = false;
    });
    
    isJitterTicking = true;
  }
});