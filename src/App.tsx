import { useState, useEffect, useRef } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import Canvas from '@components/Canvas';
import ToolSystem from '@tools/ToolSystem';
import { Toolbar } from './tools/ToolSystem';
import type { ToolBase } from './tools/Tool';
import Filebar from './components/Filebar';

function App() {
	const [image, setImage] = useState<HTMLImageElement | null>(null);
	const [isImageLoaded, setIsImageLoaded] = useState(false);
	const [panelSize, setPanelSize] = useState(80);

	const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
	const toolSystemRef = useRef<ToolSystem | null>(null);
	const [currentTool, setCurrentTool] = useState<ToolBase | null>(null);
	const currentImageId = 'default'; // For demo, use a static image id


	// Initialize ToolSystem after setViewport is available
	useEffect(() => {
		if (!toolSystemRef.current) {
			toolSystemRef.current = new ToolSystem(setViewport);
			setCurrentTool(toolSystemRef.current.currentTool);
		}
	}, [setViewport]);

	const toolSystem = toolSystemRef.current;

	// Set the current image in toolSystem when loaded
	useEffect(() => {
		if (isImageLoaded && toolSystem) {
			toolSystem.setCurrentImage(currentImageId);
		}
	}, [isImageLoaded, toolSystem]);

	useEffect(() => {
		const img = new Image();
		img.onload = () => {
			setImage(img);
			setIsImageLoaded(true);
		};
		img.onerror = () => {
			console.error("Failed to load image at /src/assets/r2.JPG");
		};

		img.src = '/src/assets/r2.JPG';

		return () => {
			img.onload = null;
			img.onerror = null;
		};
	}, []);

	// Draw all rectangle annotations
	// TODO: move draw logic over to Canvas
	const draw = (ctx: CanvasRenderingContext2D) => {
		if (isImageLoaded && image) {
			ctx.drawImage(image, 0, 0);
		}

		// Draw grid (optional, as before)
		if (viewport) {
			ctx.strokeStyle = `rgba(100,100,100,0.15)`;
			ctx.lineWidth = 0.8 / viewport.scale;

			const worldViewWidth = ctx.canvas.width / viewport.scale;
			const worldViewHeight = ctx.canvas.height / viewport.scale;
			const originXInView = -viewport.x / viewport.scale;
			const originYInView = -viewport.y / viewport.scale;
			const step = 100;
			ctx.beginPath();
			for (let x = Math.floor(originXInView / step) * step; x < originXInView + worldViewWidth; x += step) {
				ctx.moveTo(x, originYInView);
				ctx.lineTo(x, originYInView + worldViewHeight);
			}

			for (let y = Math.floor(originYInView / step) * step; y < originYInView + worldViewHeight; y += step) {
				ctx.moveTo(originXInView, y);
				ctx.lineTo(originXInView + worldViewWidth, y);
			}

			ctx.stroke();
		}

		// Draw rectangle annotations for the current image
		const annots = (toolSystem?.annotations as any)?.[currentImageId] || [];
		annots.forEach((annot: any) => {
			if (annot.type === 'rectangle' && annot.bounds && annot.bounds.length === 2) {
				const [start, end] = annot.bounds;
				const x = Math.min(start.x, end.x);
				const y = Math.min(start.y, end.y);
				const w = Math.abs(end.x - start.x);
				const h = Math.abs(end.y - start.y);
				ctx.save();
				ctx.strokeStyle = annot.color || '#FF0000';
				ctx.lineWidth = 2 / (viewport?.scale || 1);
				ctx.strokeRect(x, y, w, h);
				ctx.fillStyle = `rgba(255, 0, 0, 0.25)`;
				ctx.fillRect(x, y, w, h);
				ctx.restore();
			}
		});
	};

	const handleToolSelect = (tool: ToolBase) => {
		if (toolSystem) {
			toolSystem.setCurrentTool(tool);
			setCurrentTool(tool);
		}
	};

	return (
		<div className='flex-col flex'>
			<Filebar />
			<PanelGroup direction="horizontal" style={{ height: '100vh' }}>
				<Panel defaultSize={15} minSize={10} className='bg-(--color-medium)'>
					{toolSystem && (
						<Toolbar
							toolSystem={toolSystem}
							onToolSelect={handleToolSelect}
						/>
					)}
				</Panel>
				<PanelResizeHandle style={{ width: '4px', background: 'var(--color-light)' }} />
				<Panel defaultSize={70} minSize={25}
					onResize={(size) => setPanelSize(size)}
				>
					<div style={{
						width: '100%',
						height: '100%',
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
						padding: '20px',
						boxSizing: 'border-box',
						background: '#fff'
					}}>
						<Canvas 
							draw={draw}
							backgroundColor={'#3B3B3B'}
							toolSystem={toolSystem}
							viewport={viewport}
						/>
					</div>
				</Panel>
				<PanelResizeHandle style={{ width: '4px', background: '#ccc' }} />
				<Panel defaultSize={10} minSize={5} className='bg-(--color-medium)'>
					{/* Right panel for displaying annotations/image scrollbar */}
				</Panel>
			</PanelGroup>
		</div>
	);
}

export default App;
