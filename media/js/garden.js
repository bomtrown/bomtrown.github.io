/**
 * Garden Network Physics
 * Handles floating nodes, drawing connections, and simple expanding sub-items.
 */

const canvas = document.getElementById('garden-canvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('garden-items');

// Physics Configuration
const CONFIG = {
    speed: 0.3,
    connectionDist: 1000,
    mouseRepelDist: 150,
    mouseAttractDist: 300,
    mouseRepelForce: 0.05,
    mouseAttractForce: 0.12,
    friction: 0.98,
    padding: 50
};

let width, height;
let mouse = { x: -1000, y: -1000 }; 

// --- HTML Fixer & Initialization ---
document.querySelectorAll('.garden-node').forEach(node => {
    // 1. Convert <a> to <div> if it has subitems
    if (node.hasAttribute('data-subitems') && node.tagName === 'A') {
        const div = document.createElement('div');
        Array.from(node.attributes).forEach(attr => div.setAttribute(attr.name, attr.value));
        div.innerHTML = node.innerHTML;
        node.parentNode.replaceChild(div, node);
        node = div; 
    }

    // 2. Wrap contents in 'original-content'
    if (!node.querySelector('.original-content')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'original-content';
        wrapper.innerHTML = node.innerHTML;
        node.innerHTML = '';
        node.appendChild(wrapper);
    }

    // 3. PRE-GENERATE LISTS
    const subItemsData = node.getAttribute('data-subitems');
    if (subItemsData && !node.querySelector('.sub-item-list')) {
        try {
            const items = JSON.parse(subItemsData);
            const list = document.createElement('div');
            list.className = 'sub-item-list';
            items.forEach(item => {
                const a = document.createElement('a');
                a.href = item.href;
                a.className = 'sub-item-link';
                a.innerHTML = `${item.emoji} ${item.text}`;
                list.appendChild(a);
            });
            node.appendChild(list);
        } catch(e) { console.error("Bad JSON in subitems", e); }
    }
});

// --- Node Factory ---
function createNode(element) {
    const rect = element.getBoundingClientRect();
    return {
        element: element,
        width: rect.width,
        height: rect.height,
        x: Math.random() * (window.innerWidth - 200) + 100,
        y: Math.random() * (window.innerHeight - 200) + 100,
        vx: (Math.random() - 0.5) * CONFIG.speed,
        vy: (Math.random() - 0.5) * CONFIG.speed,
        expanded: false
    };
}

// Initialize
const domNodes = Array.from(document.querySelectorAll('.garden-node'));
const nodes = domNodes.map(el => createNode(el));

// --- Resize Handler ---
function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}
window.addEventListener('resize', resize);
resize();

// --- Mouse Tracking ---
document.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

// --- Click Interaction (Simple Toggle) ---
document.addEventListener('click', (e) => {
    const clickedElement = e.target.closest('.garden-node');
    if (!clickedElement) return;

    // Allow clicking links inside
    if (e.target.closest('.sub-item-link')) return;

    const node = nodes.find(n => n.element === clickedElement);
    if (!node) return;
    
    // Only proceed if it has subitems
    if (!clickedElement.querySelector('.sub-item-list')) return;
    
    // Toggle State
    node.expanded = !node.expanded;
    
    if (node.expanded) {
        clickedElement.classList.add('expanded');
        
        // Stop Physics
        node.vx = 0; 
        node.vy = 0;
    } else {
        clickedElement.classList.remove('expanded');
        
        // Resume Physics (Give it a gentle nudge)
        node.vx = (Math.random() - 0.5) * CONFIG.speed;
        node.vy = (Math.random() - 0.5) * CONFIG.speed;
    }

    // Update dimensions immediately for collision/drawing
    const rect = clickedElement.getBoundingClientRect();
    node.width = rect.width;
    node.height = rect.height;
});

// --- The Animation Loop ---
function animate() {
    ctx.clearRect(0, 0, width, height);

    let closestNode = null;
    let minDistance = Infinity;

    // Find closest
    nodes.forEach(node => {
        const dx = node.x + node.width/2 - mouse.x;
        const dy = node.y + node.height/2 - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDistance) {
            minDistance = dist;
            closestNode = node;
        }
    });
    
    // Update
    nodes.forEach((node, i) => {
        // Freeze visual position if expanded
        if (node.expanded) {
            node.element.style.transform = `translate(${node.x}px, ${node.y}px)`;
            return; 
        }

        const dx = node.x + node.width/2 - mouse.x;
        const dy = node.y + node.height/2 - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        // Interaction
        if (node === closestNode && dist < CONFIG.mouseAttractDist) {
            const force = (dist / CONFIG.mouseAttractDist) * CONFIG.mouseAttractForce;
            node.vx -= Math.cos(angle) * force;
            node.vy -= Math.sin(angle) * force;
            node.vx *= 0.9; 
            node.vy *= 0.9;
        } else if (dist < CONFIG.mouseRepelDist) {
            const force = (CONFIG.mouseRepelDist - dist) / CONFIG.mouseRepelDist;
            node.vx += Math.cos(angle) * force * CONFIG.mouseRepelForce;
            node.vy += Math.sin(angle) * force * CONFIG.mouseRepelForce;
        }

        // Speed Limit
        const isInteracting = (node === closestNode && dist < CONFIG.mouseAttractDist);
        if (!isInteracting) {
            const currentSpeed = Math.sqrt(node.vx*node.vx + node.vy*node.vy);
            if (currentSpeed > CONFIG.speed * 4) {
                node.vx *= 0.95;
                node.vy *= 0.95;
            }
        }

        // Move
        node.x += node.vx;
        node.y += node.vy;

        // Bounce
        if (node.x <= 0 || node.x + node.width >= width) {
            node.vx *= -1;
            node.x = Math.max(0, Math.min(node.x, width - node.width));
        }
        if (node.y <= 0 || node.y + node.height >= height) {
            node.vy *= -1;
            node.y = Math.max(0, Math.min(node.y, height - node.height));
        }

        node.element.style.transform = `translate(${node.x}px, ${node.y}px)`;

        // Lines
        for (let j = i + 1; j < nodes.length; j++) {
            const other = nodes[j];
            const dx = (node.x + node.width/2) - (other.x + other.width/2);
            const dy = (node.y + node.height/2) - (other.y + other.height/2);
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < CONFIG.connectionDist) {
                const opacity = 1 - (distance / CONFIG.connectionDist);
                ctx.beginPath();
                ctx.moveTo(node.x + node.width/2, node.y + node.height/2);
                ctx.lineTo(other.x + other.width/2, other.y + other.height/2);
                ctx.strokeStyle = `rgba(0, 0, 0, ${opacity * 2})`; 
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }
    });

    requestAnimationFrame(animate);
}

animate();