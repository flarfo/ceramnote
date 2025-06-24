import { useState, useEffect, useRef } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import Canvas from '@components/Canvas';
import ToolSystem from '@tools/ToolSystem';
import { Toolbar } from '@tools/ToolSystem';
import { Inspector } from '@components/Inspector'
import type { ToolBase } from '@tools/Tool';
import Filebar from '@components/Filebar';

function App() {
	const [image, setImage] = useState<HTMLImageElement | null>(null);
	const [isImageLoaded, setIsImageLoaded] = useState(false);
	const [panelSize, setPanelSize] = useState(80);
	const [selectedAnnotationIDs, setSelectedAnnotationIDs] = useState<string[]>([]);

	const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
	const toolSystemRef = useRef<ToolSystem | null>(null);
	const [currentTool, setCurrentTool] = useState<ToolBase | null>(null);
	const currentImageId = 'default'; // For demo, use a static image id


	// Initialize ToolSystem after setViewport is available
	useEffect(() => {
		if (!toolSystemRef.current) {
			toolSystemRef.current = new ToolSystem(setViewport, setSelectedAnnotationIDs);
			setCurrentTool(toolSystemRef.current.currentTool);
		}
	}, [setViewport]);

	useEffect(() => {
		if (toolSystemRef.current) {
			toolSystemRef.current.viewport = viewport;
		}
	}, [viewport]);

	const toolSystem = toolSystemRef.current;

	// Set the current image in toolSystem when loaded
	useEffect(() => {
		if (image && toolSystem) {
			toolSystem.setCurrentImage(currentImageId);

			const canvasWidth = window.innerWidth;
			const canvasHeight = window.innerHeight;
			
			// Adjust initial viewport so that full image fits (centered) in screen
			const aspectRatio = canvasWidth / canvasHeight;
			const scale = (image.height > image.width) ? (window.innerHeight / image.height / aspectRatio) : (window.innerWidth / image.width / aspectRatio);
			
			const initialViewport = {
				x: ((canvasWidth / scale) - image.width) * 0.5,
				y: ((canvasHeight / scale) - image.height) * 0.5,
				scale
			};
			
			setViewport(initialViewport);
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
						<>
							<Toolbar
								toolSystem={toolSystem}
								onToolSelect={handleToolSelect}
							/>
							<Inspector 
								toolSystem={toolSystem}
								selectedAnnotationIDs={selectedAnnotationIDs}
							/>
						</>
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
							image={image}
							currentImageId={currentImageId}
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
