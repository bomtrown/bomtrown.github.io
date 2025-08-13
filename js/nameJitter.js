const header = document.querySelector('h1.jitter');

if (!header.dataset.split) {
  const nodes = Array.from(header.childNodes);
  const newNodes = [];

  nodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      const letters = node.textContent.split('');
      letters.forEach(letter => {
        if (letter === ' ') {
          newNodes.push(document.createTextNode(' ')); // Keep as raw space
        } else {
          const span = document.createElement('span');
          span.textContent = letter;
          span.dataset.char = letter;
          newNodes.push(span);
        }
      });
    } else if (node.nodeName === 'BR') {
      newNodes.push(document.createElement('br'));
    } else {
      newNodes.push(node.cloneNode(true));
    }
  });

  header.innerHTML = '';
  newNodes.forEach(n => header.appendChild(n));
  header.dataset.split = 'true';
}

function fakeNoise(x) {
  const value =
    Math.sin(x) +
    0.5 * Math.sin(2.3 * x + 1.1) +
    0.3 * Math.sin(4.7 * x + 2.8) +
    0.2 * Math.sin(9.2 * x + 4.5) +
    0.1 * Math.sin(15.6 * x + 0.9);

  const normalised = 0.5 * (value / (1 + 0.5 + 0.3 + 0.2 + 0.1)) + 0.5;
  return normalised;
}


const spans = header.querySelectorAll('span');

window.addEventListener('scroll', () => {
  const scrollTop = window.scrollY;

  spans.forEach((span, index) => {
    const originalChar = span.dataset.char;
    if (!originalChar || originalChar.trim() === '') return; // Skip blank or whitespace

    const blipSeed = (scrollTop + fakeNoise(index) * 1000) / 100;
    const weight = index / spans.length + scrollTop / 5000; // Weight based on position in the header from 0 to 1

    // === CHARACTER FLICKER ===
    const charChangeThreshold = weight * 0.5;

    if (fakeNoise(blipSeed) < charChangeThreshold) {
      const glitchChars = ['@', '#', '%', '&', '*', '~', '?'];
      const glitchLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
      const glitchNums = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
      span.textContent = glitchChars[Math.floor(fakeNoise(index) * glitchChars.length)];
    } else {
      span.textContent = originalChar;
    }

    // === TEXT COLOUR ===
    const colourThreshold = 0.5 * weight;

    if (fakeNoise(blipSeed) < colourThreshold) {
      const hues = [0, 50, 210]; // Red, Yellow, Blue
      const hue = hues[Math.floor(fakeNoise(index) * hues.length)];
      span.style.color = `hsl(${hue}, 90%, 60%)`;
    } else {
      const lightness = 10 + (Math.sin(blipSeed / 2) + 1) * 5;
      span.style.color = `hsl(0, 0%, ${lightness}%)`;
    }

    // === BACKGROUND COLOUR ===
    const bgThreshold = weight * 0.5;

    if (fakeNoise(blipSeed + 2356) < bgThreshold) {
      span.style.backgroundColor = 'black';
      span.style.color = 'white';
    } else {
      span.style.backgroundColor = 'white';
    }
  });
});