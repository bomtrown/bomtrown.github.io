const waveHeader = document.querySelector('.project-heading h1');

if (waveHeader) {
  const text = waveHeader.textContent;
  
  // 1. Keep a hidden "ghost" of the text so the container maintains its natural width/height
  waveHeader.innerHTML = `<span style="opacity: 0; pointer-events: none;">${text}</span>`;

  const numSlices = 8; // Higher = smoother wave, but slightly heavier on the browser
  const slices = [];

  // 2. Generate the slices
  for (let i = 0; i < numSlices; i++) {
    const slice = document.createElement('span');
    slice.className = 'wave-slice';
    slice.textContent = text;
    
    // Calculate the percentage bounds for this specific horizontal strip
    const topPercent = (i / numSlices) * 100;
    const bottomPercent = 100 - ((i + 1) / numSlices) * 100;
    
    // clip-path: inset(top right bottom left)
    slice.style.clipPath = `inset(${topPercent}% 0 ${bottomPercent}% 0)`;
    
    waveHeader.appendChild(slice);
    
    // Store the element and its vertical index for the animation loop
    slices.push({ element: slice, index: i });
  }

  // 3. Animate the wave
  let time = 0;
  const waveSpeed = 0.005;      // How fast the wave travels
  const waveAmplitude = 400;    // How far left/right it pushes (in pixels)
  const waveFrequency = 0.02;  // How "tight" the wave curves are vertically

  function animateWave() {
    time += waveSpeed;

    slices.forEach(slice => {
      // Here is the math you described! 
      // Math.sin() gives us the smooth ease-in/ease-out.
      // We add (slice.index * waveFrequency) to 'time' so that slices further down are "ahead" in the phase.
    //const shiftX = -Math.pow(Math.tan(time + slice.index * waveFrequency), 5) * waveAmplitude;
    const shiftX = -(2/(1+Math.pow(1.07,-1*Math.tan(time + slice.index * waveFrequency)))-1) * waveAmplitude;
      
      slice.element.style.transform = `translateX(${shiftX}px)`;
    });

    requestAnimationFrame(animateWave);
  }

  // Start the loop
  animateWave();
}