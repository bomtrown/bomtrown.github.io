// Get canvas elements and contexts
const canvas = document.getElementById('sineCanvas');
const ctx = canvas.getContext('2d');

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

// Update the wave's phase based on scroll position
function updatePhase() {
  const scrollY = window.scrollY || window.pageYOffset;
  targetPhase = scrollY * 0.01; // Adjust for scroll sensitivity

  // Apply overdamped smoothing
  phase += (targetPhase - phase) * dampingFactor;

  // Draw updated visuals
  drawSineWaves();
  //drawRadialPattern();

  // Continue animation loop
  requestAnimationFrame(updatePhase);
}

// Start the animation loop
updatePhase();