// Converts screen (mouse) coordinates to world coordinates
const screenToWorld = (
    position: { x: number, y: number },
    viewport: { x: number, y: number, scale: number },
    canvasRect: DOMRect
) => {
    const x = (position.x - canvasRect.left) / viewport.scale - viewport.x;
    const y = (position.y - canvasRect.top) / viewport.scale - viewport.y;
    return { x, y };
};

// Converts world coordinates to screen (pixel) coordinates
const worldToScreen = (
    world: { x: number, y: number },
    viewport: { x: number, y: number, scale: number },
    canvasRect: DOMRect
) => {
    const x = (world.x + viewport.x) * viewport.scale + canvasRect.left;
    const y = (world.y + viewport.y) * viewport.scale + canvasRect.top;
    return { x, y };
};

export { screenToWorld, worldToScreen };