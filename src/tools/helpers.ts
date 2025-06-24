// Converts screen (mouse) coordinates to world coordinates
const screenToWorld = (
    position: { x: number, y: number },
    viewport: { x: number, y: number, scale: number },
    canvasRect: DOMRect
) : { x: number, y: number } => {
    const x = (position.x - canvasRect.left) / viewport.scale - viewport.x;
    const y = (position.y - canvasRect.top) / viewport.scale - viewport.y;
    return { x, y };
};

// Converts world coordinates to screen (pixel) coordinates
const worldToScreen = (
    world: { x: number, y: number },
    viewport: { x: number, y: number, scale: number },
    canvasRect: DOMRect
) : { x: number, y: number } => {
    const x = (world.x + viewport.x) * viewport.scale + canvasRect.left;
    const y = (world.y + viewport.y) * viewport.scale + canvasRect.top;
    return { x, y };
};

const inBounds = (
    position: { x: number, y: number },
    bounds: { x: number, y: number }[]
) : boolean => {
    // Ensure proper right/left top/bottom ordering
    const minX = Math.min(bounds[0].x, bounds[1].x);
    const maxX = Math.max(bounds[0].x, bounds[1].x);
    const minY = Math.min(bounds[0].y, bounds[1].y);
    const maxY = Math.max(bounds[0].y, bounds[1].y);

    const result = (minX <= position.x && position.x <= maxX && minY <= position.y && position.y <= maxY);
    return result;
}

export { screenToWorld, worldToScreen, inBounds };