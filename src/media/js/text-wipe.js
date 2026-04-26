const projectRows = document.querySelectorAll('.project-row');

// Config
const numSlices = 12; 
const waveSpeed = 0.01;      
const waveAmplitude = 100;   
const waveFrequency = 0.1;  

projectRows.forEach(row => {
    const header = row.querySelector('.glitch-title');
    if (!header) return;

    const text = header.textContent.trim();
    if (!text) return;

    // 1. Keep a hidden "ghost" of the text so the container maintains its natural size
    header.innerHTML = `<span class="ghost" style="opacity: 0; pointer-events: none; display: inline-block;">${text}</span>`;
    header.style.position = 'relative';
    header.style.overflow = 'hidden'; 

    // Measure the exact width of the inner ghost text
    const ghost = header.querySelector('.ghost');
    const textWidth = ghost.offsetWidth || 300; 
    const gap = 50; 
    const wrapWidth = textWidth + gap;

    const slices = [];

    // 2. Generate the slices
    for (let i = 0; i < numSlices; i++) {
        const slice = document.createElement('span');
        slice.className = 'wave-slice';
        slice.textContent = text;
        
        const topPercent = (i / numSlices) * 100;
        const bottomPercent = 100 - ((i + 1) / numSlices) * 100;
        
        // Strict 0% inset on left and right so slices guillotine exactly at the edges of the word
        slice.style.clipPath = `inset(${topPercent}% 0 ${bottomPercent}% 0)`;
        slice.style.position = 'absolute';
        slice.style.top = '0';
        slice.style.left = '0';
        slice.style.width = '100%';
        slice.style.whiteSpace = 'normal'; 
        slice.style.pointerEvents = 'none';
        slice.style.color = 'inherit'; 
        
        // PAC-MAN MAGIC: Cast shadow-clones of the text to the left and right.
        slice.style.textShadow = `
            ${wrapWidth}px 0 0 currentColor, 
            -${wrapWidth}px 0 0 currentColor,
            ${wrapWidth * 2}px 0 0 currentColor,
            -${wrapWidth * 2}px 0 0 currentColor
        `;
        
        header.appendChild(slice);
        slices.push({ element: slice, index: i });
    }

    // 3. Animation State Management
    let isAnimating = false;
    let time = 0;
    let animationFrameId;

    function animateWave() {
        if (!isAnimating) return;
        
        time += waveSpeed;

        slices.forEach(slice => {
            const rawShiftX = -(2/(1+Math.pow(1.07,-1*Math.tan(time + slice.index * waveFrequency)))-1) * waveAmplitude;
            const shiftX = rawShiftX % wrapWidth;
            slice.element.style.transform = `translateX(${shiftX}px)`;
        });

        animationFrameId = requestAnimationFrame(animateWave);
    }

    function checkState() {
        const shouldAnimate = row.getAttribute('data-expanded') === 'true';

        if (shouldAnimate && !isAnimating) {
            // Start Animation
            isAnimating = true;
            cancelAnimationFrame(animationFrameId);
            
            // REMOVE transition so the Pac-Man loop jumps instantly without whooshing
            slices.forEach(slice => {
                slice.element.style.transition = 'none';
            });
            
            animateWave();
        } else if (!shouldAnimate && isAnimating) {
            // Stop Animation
            isAnimating = false;
            cancelAnimationFrame(animationFrameId);
            
            // ADD transition back, then snap slices back to center smoothly
            slices.forEach(slice => {
                slice.element.style.transition = 'transform 0.15s ease-out';
                slice.element.style.transform = `translateX(0px)`;
            });
        }
    }

    // Event Listeners to toggle states
    row.addEventListener('statechange', checkState);
});