const header = document.querySelector('h1.jitter');

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
function fakeNoise(x) {
  const value =
    Math.sin(x) +
    0.5 * Math.sin(2.3 * x + 1.1) +
    0.3 * Math.sin(4.7 * x + 2.8) +
    0.2 * Math.sin(9.2 * x + 4.5) +
    0.1 * Math.sin(15.6 * x + 0.9);

  return 0.5 * (value / (1 + 0.5 + 0.3 + 0.2 + 0.1)) + 0.5;
}

// Linear Interpolation
function lerp(start, end, progress) {
  return start + (end - start) * progress;
}

const spans = header.querySelectorAll('span');
let isJitterTicking = false;

window.addEventListener('scroll', () => {
  if (!isJitterTicking) {
    window.requestAnimationFrame(() => {
      const scrollTop = window.scrollY;
      const vh = window.innerHeight;
      const maxScroll = Math.max(document.body.scrollHeight - vh, 1);
      const startFadeIn = Math.max(vh * 1.5, maxScroll - vh * 0.4);

      // === THE TIMELINE ===
      // Added morph, centerFade, and string inputs! 
      // Note: "PROJECTS " has a space at the end to match the 9 characters of "TOM BROWN"
      const timeline = [
        { scroll: 0,           jitter: 0,   whiteout: 0,   morph: 0, centerFade: 0, string: "TOM BROWN" },
        { scroll: vh * 0.4,    jitter: 0.7, whiteout: 0,   morph: 0, centerFade: 0, string: "TOM BROWN" },
        { scroll: vh * 0.7,    jitter: 0,   whiteout: 0,   morph: 1, centerFade: 0, string: "PROJECTS " },
        { scroll: vh * 1.0,    jitter: 0,   whiteout: 1.0, morph: 1, centerFade: 0, string: "PROJECTS " },
        { scroll: vh * 1.5,    jitter: 0.5,   whiteout: 1,   morph: 1, centerFade: 1, string: "PROJECTS " },
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
      spans.forEach((span, index) => {
        const lineIdx = parseInt(span.dataset.line);
        const localIdx = parseInt(span.dataset.localIndex);
        const originalChar = span.dataset.char;
        
        // 1. MORPH LOGIC (Center line only)
        let displayChar = originalChar;
        if (lineIdx === 2) { 
            // Glitch into the new string based on morph progress
            const morphThreshold = fakeNoise(index * 21); // Unique seed so it scrambles in
            if (currentMorph > morphThreshold) {
                // Swap to the target character, fallback to space if the target string is shorter
                displayChar = targetChars[localIdx] || ' '; 
            }
        }

        // 2. WHITEOUT / DISAPPEAR LOGIC
        const disappearThreshold = fakeNoise(index * 13); 
        
        // Use centerFade for the middle line (index 2), and whiteout for all others
        let effectiveWhiteout = (lineIdx === 2) ? currentCenterFade : currentWhiteout;

        if (effectiveWhiteout > disappearThreshold) {
          span.style.opacity = '0';
          return; // Skip rendering glitch math if the letter is invisible
        } else {
          span.style.opacity = '1';
        }

        const blipSeed = (scrollTop + fakeNoise(index) * 1000) / 100;
        const weight = currentJitter;

        // 3. CHARACTER FLICKER
        const charChangeThreshold = weight * 0.5;
        if (fakeNoise(blipSeed) < charChangeThreshold) {
          const glitchChars = ['@', '#', '%', '&', '*', '~', '?'];
          span.textContent = glitchChars[Math.floor(fakeNoise(index) * glitchChars.length)];
        } else {
          span.textContent = displayChar; // Render original OR morphed char
        }

        // 4. TEXT COLOUR
        const colourThreshold = 0.5 * weight;
        if (fakeNoise(blipSeed) < colourThreshold) {
          const hues = [0, 50, 210];
          const hue = hues[Math.floor(fakeNoise(index) * hues.length)];
          span.style.color = `hsl(${hue}, 90%, 60%)`;
        } else {
          const lightness = (Math.sin(blipSeed / 2) + 1) * 5;
          span.style.color = `hsl(0, 0%, ${lightness}%)`;
        }

        // 5. BACKGROUND COLOUR
        const bgThreshold = weight * 0.5;
        if (fakeNoise(blipSeed + 2356) < bgThreshold) {
          span.style.backgroundColor = 'black';
          span.style.color = 'white';
        } else {
          span.style.backgroundColor = 'var(--bg-color)';
        }
      });
      
      isJitterTicking = false;
    });
    
    isJitterTicking = true;
  }
});