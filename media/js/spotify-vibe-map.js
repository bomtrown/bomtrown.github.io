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
            
            // The inner content (hidden until expanded)
            el.innerHTML = `
                <div class="playlist-info">
                    <div class="playlist-title">${n.name}</div>
                    <a href="${n.url}" target="_blank" class="spotify-link">Listen on Spotify ↗</a>
                </div>
            `;
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
                expanded: false,
                isHovered: false // Track hover state for physics freeze
            };
            
            nodes.push(nodeObj);
            nodeMap[n.id] = nodeObj;

            // Hover tracking
            el.addEventListener('mouseenter', () => nodeObj.isHovered = true);
            el.addEventListener('mouseleave', () => nodeObj.isHovered = false);
            
            // Add Click Listener
            el.addEventListener('click', (e) => {
                // Don't trigger if they clicked the Spotify link
                if (e.target.closest('.spotify-link')) return;

                const oldWidth = nodeObj.width;
                const oldHeight = nodeObj.height;

                nodeObj.expanded = !nodeObj.expanded;
                
                if (nodeObj.expanded) {
                    el.classList.add('expanded');
                    nodeObj.vx = 0; nodeObj.vy = 0;
                } else {
                    el.classList.remove('expanded');
                    // Gentle nudge on close
                    nodeObj.vx = (Math.random() - 0.5) * 5;
                    nodeObj.vy = (Math.random() - 0.5) * 5;
                }

                // Update dimensions for the physics engine
                setTimeout(() => {
                    const rect = el.getBoundingClientRect();
                    
                    // Adjust X/Y so it expands smoothly from its center instead of top-left
                    if (nodeObj.expanded) {
                        nodeObj.x -= (rect.width - oldWidth) / 2;
                        nodeObj.y -= (rect.height - oldHeight) / 2;
                    } else {
                        nodeObj.x += (oldWidth - rect.width) / 2;
                        nodeObj.y += (oldHeight - rect.height) / 2;
                    }
                    
                    nodeObj.width = rect.width;
                    nodeObj.height = rect.height;
                }, 50); // Small delay to let CSS transition apply
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
                rawDistance: l.distance // Keep for reference
            })).filter(l => l.source && l.target); // Filter out any broken links

        // Start loop
        animate();

    } catch (err) {
        console.error("Error loading vibe matrix! Make sure vibe_matrix.json is in the same folder.", err);
        container.innerHTML = `<h2 style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);">Could not load vibe_matrix.json. Please run the Python script first!</h2>`;
    }
}

// --- The Physics Animation Loop ---
function animate() {
    ctx.clearRect(0, 0, width, height);

    // 1. Calculate Forces
    for (let i = 0; i < nodes.length; i++) {
        let n1 = nodes[i];
        if (n1.expanded) continue; // Expanded nodes freeze in place

        // A. Repulsion (Push away from all other nodes)
        for (let j = i + 1; j < nodes.length; j++) {
            let n2 = nodes[j];
            if (n2.expanded) continue;

            let dx = n1.x - n2.x;
            let dy = n1.y - n2.y;
            let dist = Math.sqrt(dx * dx + dy * dy) || 1; // avoid divide by zero

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

        if (!n1.expanded) { n1.vx += fx; n1.vy += fy; }
        if (!n2.expanded) { n2.vx -= fx; n2.vy -= fy; }
    });

    // 3. Update Positions, Draw Lines, Update DOM
    
    // Draw Algorithmic Strength Lines!
    ctx.lineWidth = window.innerWidth < 600 ? 2.5 : 1.5; // Thicker lines on mobile for visibility
    links.forEach(link => {
        let n1 = link.source;
        let n2 = link.target;
        
        // Map the active distance range to a 1.0 -> 0.0 strength curve
        let normalizedStrength = Math.max(0, (0.82 - link.rawDistance) / 0.40);
        let opacity = Math.pow(normalizedStrength, 1.2) * 0.8; 

        // Prevent lines stretching across the entire screen if they are pulled apart
        let dx = n1.x - n2.x;
        let dy = n1.y - n2.y;
        let screenDist = Math.sqrt(dx*dx + dy*dy);
        
        if (screenDist < 1200) { 
            // Fade out lines physically stretched too far
            let distFade = Math.max(0, 1 - (screenDist / 1200));
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
        if (!node.expanded && !node.isHovered) {
            // Standard physics
            node.vx *= CONFIG.friction;
            node.vy *= CONFIG.friction;
        } else if (node.isHovered && !node.expanded) {
            // Dampen movement quickly so you can "catch" it with your mouse
            node.vx *= 0.5;
            node.vy *= 0.5;
        }
        
        if (!node.expanded) {
            // Speed Limit
            const speed = Math.sqrt(node.vx*node.vx + node.vy*node.vy);
            if (speed > 10) {
                node.vx = (node.vx / speed) * 10;
                node.vy = (node.vy / speed) * 10;
            }

            node.x += node.vx;
            node.y += node.vy;

            // Soft Screen Boundaries (Bounce off walls)
            if (node.x <= 0 || node.x + node.width >= width) {
                node.vx *= -0.8; // Dampen the bounce
                node.x = Math.max(0, Math.min(node.x, width - node.width));
            }
            if (node.y <= 0 || node.y + node.height >= height) {
                node.vy *= -0.8; // Dampen the bounce
                node.y = Math.max(0, Math.min(node.y, height - node.height));
            }
        }

        // Apply to DOM ALWAYS
        const scale = (node.isHovered && !node.expanded) ? ' scale(1.05)' : '';
        node.element.style.setProperty('transform', `translate(${node.x}px, ${node.y}px)${scale}`, 'important');
    });

    requestAnimationFrame(animate);
}

// Kick it off!
initGraph();