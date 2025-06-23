

const toCanvasCoords = (position: {x: number, y: number}, viewport: { x: number, y: number, scale: number }, canvasRect: DOMRect) => {
    // Subtract pan offset, then scale
    let x = (position.x - canvasRect.left - viewport.x) / viewport.scale;
    let y = (position.y - canvasRect.top - viewport.y) / viewport.scale;
    
    return { x, y };
};

export { toCanvasCoords };