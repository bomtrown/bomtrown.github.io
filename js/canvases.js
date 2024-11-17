// Get canvas elements and contexts
const canvas = document.getElementById('sineCanvas');
const ctx = canvas.getContext('2d');
const canvas2 = document.getElementById('radialCanvas');
const ctx2 = canvas2.getContext('2d');

// Sine wave properties
let amplitude = canvas.width / 2.5; // Wave amplitude
let frequency = 0.0005; // Wave frequency
let phase = 0; // Initial phase

// Overdamped spring properties
let targetPhase = 0; // Target phase based on scroll position
const dampingFactor = 0.15; // Smoothing factor

// Draw sine waves with variable opacity
function drawSineWaves() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  function drawSine(offsetPhase, scrollMultiplier) {
    ctx.lineWidth = 4; // Stroke width
    ctx.beginPath();

    for (let y = 0; y < canvas.height; y++) {
      // Calculate the x position of the sine wave
      const x =
        canvas.width / 2 +
        amplitude *
          (Math.sin(canvas.height * frequency * y + phase * scrollMultiplier + offsetPhase) +
            0.1 * Math.sin(0.7 * canvas.height * frequency * y + 1.2 * phase * scrollMultiplier));

      // Calculate variable opacity based on wave properties
      const opacity =
        0.5 +
        0.5 *
          Math.sin(
            canvas.height * frequency * y +
              phase * scrollMultiplier +
              Math.PI / 2 +
              offsetPhase
          ); // Values between 0 and 1

      // Set stroke style with calculated opacity
      ctx.strokeStyle = `rgba(0, 0, 0, ${opacity})`;

      // Draw each segment separately to apply individual opacity
      if (y === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath(); // Start a new path for the next segment
        ctx.moveTo(x, y);
      }
    }
  }

  // Draw two sine waves with different phases
  drawSine(0, 2);
  drawSine(Math.PI, 2.6);
}

// Draw radial pattern
function drawRadialPattern() {
  ctx2.clearRect(0, 0, canvas2.width, canvas2.height);
  ctx2.lineWidth = 4; // Stroke width

  const centerX = canvas2.width / 2;
  const centerY = canvas2.height / 2;
  const maxRadius = Math.min(centerX, centerY) - 10; // Radius within canvas

  const aspectRatio = canvas2.width / canvas2.height;

  ctx2.beginPath();
  for (let theta = 0; theta <= 2 * Math.PI; theta += 0.01) {
    const r =
      0.5 * maxRadius *
      (Math.sin(5 * Math.sin(phase) * Math.cos(theta) + 5 * phase) + 1);

    // Adjust x and y based on the aspect ratio
    const x = centerX + r * Math.cos(theta) * aspectRatio;
    const y = centerY + r * Math.sin(theta);

    if (theta === 0) {
      ctx2.moveTo(x, y);
    } else {
      ctx2.lineTo(x, y);
    }
  }
  ctx2.strokeStyle = 'white';
  ctx2.stroke();
}

// Update the wave's phase based on scroll position
function updatePhase() {
  const scrollY = window.scrollY || window.pageYOffset;
  targetPhase = scrollY * 0.01; // Adjust for scroll sensitivity

  // Apply overdamped smoothing
  phase += (targetPhase - phase) * dampingFactor;

  // Draw updated visuals
  drawSineWaves();
  drawRadialPattern();

  // Continue animation loop
  requestAnimationFrame(updatePhase);
}

// Start the animation loop
updatePhase();