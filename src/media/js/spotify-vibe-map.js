/**
 * Force-Directed Graph Physics Engine
 * Reads vibe_matrix.json and applies spring & repulsion forces.
 */
const canvas = document.getElementById('vibe-canvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('vibe-items');

// Physics Configuration - Optimized for breathing room and fluid untangling
const CONFIG = {
    repulsion: 7000,      // Stronger push so nodes don't overlap
    springFactor: 0.005,  // Softer springs so they don't violently snap
    centerGravity: 0.0008,// Very gentle center pull to prevent tight center clumps
    friction: 0.92,       // Less friction allows them to glide and untangle smoothly
    mouseRepelDist: 200,
    mouseRepelForce: -0.8,
    
    // Map JSON distance (0.0 - 1.0) to pixel distances on screen
    minSpringLength: 50, // Give closely related items more physical space
    maxSpringLength: 200  // Maximum stretch for related items
};


// --- Modal Logic ---
const modal = document.getElementById('vibe-modal');
const modalImg = document.getElementById('modal-img');
const modalTitle = document.getElementById('modal-title');
const modalDesc = document.getElementById('modal-desc');
const modalLink = document.getElementById('modal-link');
const vibeBlur = document.getElementById('vibe-blur');

function openModal(data) {
    modalImg.src = data.image;
    modalTitle.textContent = data.name;
    modalDesc.textContent = data.description || "A sonic landscape to explore."; 
    modalLink.href = data.url;
    modal.classList.add('visible');
    
    // Instantly apply the horizontal blur
    if (vibeBlur) vibeBlur.setAttribute('stdDeviation', '24 0');
}

function closeModal() {
    modal.classList.remove('visible');
    
    // Instantly remove the blur
    if (vibeBlur) vibeBlur.setAttribute('stdDeviation', '0 0');
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.querySelector('.modal-backdrop').addEventListener('click', closeModal);

let width, height;
let mouse = { x: -1000, y: -1000 }; 

let nodes = [];
let links = [];
let nodeMap = {}; // Quick lookup by ID

// --- Resize Handler ---
function resize() {
    // Use the container's exact dimensions instead of the window.
    // This stops nodes from bleeding off the right side (accounting for scrollbars)
    // and correctly bounds the bottom so they don't overlap the title below.
    width = container.clientWidth;
    height = container.clientHeight;
    
    // Fix for high DPI (mobile/retina) screens making lines look extremely thin
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    
    // Adjust physics bounds for smaller screens so it fits nicely
    const isMobile = width < 600;
    CONFIG.minSpringLength = isMobile ? 30 : 50;
    CONFIG.maxSpringLength = isMobile ? 120 : 200;
    CONFIG.repulsion = isMobile ? 4000 : 7000;
}
window.addEventListener('resize', resize);
resize();

// --- Mouse Tracking ---
document.addEventListener('mousemove', (e) => {
    // Offset the mouse coordinates by the container's position.
    // This ensures physics (hover/repel) still align perfectly if you scroll down!
    const rect = container.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});

// --- Fetch Data and Initialize ---
async function initGraph() {
    try {
        // Fetch the local playlist database!
        const response = await fetch('./vibe_matrix.json');
        const data = await response.json();
        
        // 1. Create HTML Elements and Physics Nodes
        data.nodes.forEach(n => {
            // Create DOM Element
            const el = document.createElement('div');
            el.className = 'vibe-node';
            el.style.backgroundImage = `url('${n.image}')`;
            container.appendChild(el);

            // Create Physics Object - Spawn across the whole screen to aid initial sorting
            const nodeObj = {
                id: n.id,
                element: el,
                width: 40, // initial circle size
                height: 40,
                x: Math.random() * (width - 40),
                y: Math.random() * (height - 40),
                vx: (Math.random() - 0.5) * 10, // Give them initial momentum to break clumps
                vy: (Math.random() - 0.5) * 10,
                isHovered: false 
            };
            
            nodes.push(nodeObj);
            nodeMap[n.id] = nodeObj;

            // Hover tracking
            el.addEventListener('mouseenter', () => nodeObj.isHovered = true);
            el.addEventListener('mouseleave', () => nodeObj.isHovered = false);
            
            // Open modal on click
            el.addEventListener('click', () => {
                openModal(n);
            });
        });

        // 2. Process Links - CRITICAL FIX: Only apply physics springs to actual relationships!
        links = data.links
            .filter(l => l.distance < 0.80) // Ignore completely unrelated playlists to stop wall-smashing
            .map(l => ({
                source: nodeMap[l.source],
                target: nodeMap[l.target],
                // Convert algorithm distance to screen pixels
                targetDist: CONFIG.minSpringLength + (l.distance * (CONFIG.maxSpringLength - CONFIG.minSpringLength)),
                rawDistance: l.distance 
            })).filter(l => l.source && l.target); 

        // Start loop
        animate();

    } catch (err) {
        console.error("Error loading vibe matrix!", err);
        container.innerHTML = `<h2 style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);">Could not load vibe_matrix.json.</h2>`;
    }
}

// --- The Physics Animation Loop ---
function animate() {
    ctx.clearRect(0, 0, width, height);

    // 1. Calculate Forces
    for (let i = 0; i < nodes.length; i++) {
        let n1 = nodes[i];

        // A. Repulsion
        for (let j = i + 1; j < nodes.length; j++) {
            let n2 = nodes[j];
            let dx = n1.x - n2.x;
            let dy = n1.y - n2.y;
            let dist = Math.sqrt(dx * dx + dy * dy) || 1; 

            // Increased repel radius so they push each other away from further out
            if (dist < 600) {
                let force = CONFIG.repulsion / (dist * dist);
                let fx = (dx / dist) * force;
                let fy = (dy / dist) * force;
                
                n1.vx += fx; n1.vy += fy;
                n2.vx -= fx; n2.vy -= fy;
            }
        }

        // B. Center Gravity (Pull gently to center of screen)
        let cx = (width / 2) - (n1.x + n1.width / 2);
        let cy = (height / 2) - (n1.y + n1.height / 2);
        n1.vx += cx * CONFIG.centerGravity;
        n1.vy += cy * CONFIG.centerGravity;

        // C. Mouse Interaction (Repel)
        let mx = (n1.x + n1.width / 2) - mouse.x;
        let my = (n1.y + n1.height / 2) - mouse.y;
        let mDist = Math.sqrt(mx * mx + my * my);
        if (mDist < CONFIG.mouseRepelDist) {
            let force = (CONFIG.mouseRepelDist - mDist) / CONFIG.mouseRepelDist;
            n1.vx += (mx / mDist) * force * CONFIG.mouseRepelForce;
            n1.vy += (my / mDist) * force * CONFIG.mouseRepelForce;
        }
    }

    // 2. Apply Spring Forces (Pull/Push linked nodes)
    links.forEach(link => {
        let n1 = link.source;
        let n2 = link.target;
        
        let dx = n2.x - n1.x;
        let dy = n2.y - n1.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        
        // Hooke's Law: Force = k * displacement
        let displacement = dist - link.targetDist;
        let force = displacement * CONFIG.springFactor;

        let fx = (dx / dist) * force;
        let fy = (dy / dist) * force;

        n1.vx += fx; n1.vy += fy; 
        n2.vx -= fx; n2.vy -= fy; 
    });

    // 3. Update Positions & Draw
    
    // Define the flashlight radius
    const effectRadiusSq = 250 * 250; 

    // Draw Lines
    ctx.lineWidth = window.innerWidth < 600 ? 2.5 : 1.5; 
    links.forEach(link => {
        let n1 = link.source;
        let n2 = link.target;
        
        // Map the active distance range to a 1.0 -> 0.0 strength curve
        let normalizedStrength = Math.max(0, (0.82 - link.rawDistance) / 0.40);
        let opacity = Math.pow(normalizedStrength, 1.2) * 0.8; 

        let dx = n1.x - n2.x;
        let dy = n1.y - n2.y;
        let screenDist = Math.sqrt(dx*dx + dy*dy);
        
        if (screenDist < 1200) { 
            // Fade out lines physically stretched too far
            let distFade = Math.max(0, 1 - (screenDist / 1200));
            // Multiply total opacity by the proximity factor to hide them in the dark
            let finalOpacity = opacity * distFade; 

            if (finalOpacity > 0.02) {
                ctx.beginPath();
                ctx.moveTo(n1.x + n1.width/2, n1.y + n1.height/2);
                ctx.lineTo(n2.x + n2.width/2, n2.y + n2.height/2);
                ctx.strokeStyle = `rgba(0, 0, 0, ${finalOpacity})`; 
                ctx.stroke();
            }
        }
    });

    // Move Nodes
    nodes.forEach(node => {
        if (!node.isHovered) {
            node.vx *= CONFIG.friction;
            node.vy *= CONFIG.friction;
        } else {
            node.vx *= 0.5;
            node.vy *= 0.5;
        }
        
        const speed = Math.sqrt(node.vx*node.vx + node.vy*node.vy);
        if (speed > 10) {
            node.vx = (node.vx / speed) * 10;
            node.vy = (node.vy / speed) * 10;
        }

        node.x += node.vx;
        node.y += node.vy;

        if (node.x <= 0 || node.x + node.width >= width) {
            node.vx *= -0.8; 
            node.x = Math.max(0, Math.min(node.x, width - node.width));
        }
        if (node.y <= 0 || node.y + node.height >= height) {
            node.vy *= -0.8; 
            node.y = Math.max(0, Math.min(node.y, height - node.height));
        }

        // --- Proximity Reveal Logic (The Flashlight Effect) ---
        let mx = (node.x + node.width / 2) - mouse.x;
        let my = (node.y + node.height / 2) - mouse.y;
        let distSq = (mx * mx) + (my * my);
        
        let proxFactor = 0;
        if (distSq < effectRadiusSq) {
            proxFactor = 1 - (distSq / effectRadiusSq);
        }

        let currentScale = 0.25 + (0.75 * proxFactor);
        if (node.isHovered) currentScale *= 1.05;

        node.element.style.setProperty('transform', `translate(${node.x}px, ${node.y}px) scale(${currentScale})`, 'important');
        node.element.style.filter = `brightness(${proxFactor})`;
    });

    requestAnimationFrame(animate);
}

// Kick it off!
initGraph();