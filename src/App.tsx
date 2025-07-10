import { useState, useEffect, useRef, useCallback } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import Canvas from './components/Canvas';
import ToolSystem from './tools/ToolSystem';
import { Toolbar } from './tools/ToolSystem';
import { Inspector } from './components/Inspector'
import type { ToolBase } from './tools/Tool';
import Filebar from './components/Filebar';

import { ConfigManager, DEFAULT_CONFIG, type AppConfig } from './tools/config_manager';
import { model_loader } from './onnx/model_loader';
import { inference_pipeline } from './onnx/inference_pipeline';
import type { InferenceSession } from 'onnxruntime-web/wasm';
import { Annotation } from './components/Annotation';

/**
 * App component; base rendering point, handles cross-component state. 
 */
function App() {
	const [image, setImage] = useState<HTMLImageElement | null>(null); // Current loaded image
	// TODO: allow user to switch to new image from list of all uploaded
	const [imageFiles, setImageFiles] = useState<FileList | null>(null); // All image files (if multiple selected)
	const [isImageLoaded, setIsImageLoaded] = useState(false);
	const [panelSize, setPanelSize] = useState(80);
	const [selectedAnnotationIDs, setSelectedAnnotationIDs] = useState<string[]>([]);
	const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);

	// Warmed-up and ready for use
	const [loadedModels, setLoadedModels] = useState<Record<string, InferenceSession>>({});
	// Initial state should be default models (already stored in public directory)
	// TODO: add session config for each model, i.e. user can change confidence levels, id -> class mappings
	const [availableModels, setAvailableModels] = useState<Record<string, string>>(
		{
			'tile_detector': '/models/tile_detector.onnx', 
		}
	);
	const [selectedModels, setSelectedModels] = useState<string[]>([]);

	const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
	const toolSystemRef = useRef<ToolSystem | null>(null);
	const configManagerRef = useRef<ConfigManager | null>(null);
	const [currentTool, setCurrentTool] = useState<ToolBase | null>(null);
	const [currentAnnotationClass, setCurrentAnnotationClass] = useState<string>('');

	const [currentImageId, setCurrentImageId] = useState('');

	// Initialize ConfigManager and ToolSystem after setViewport is available
	useEffect(() => {
		if (!configManagerRef.current) {
			configManagerRef.current = new ConfigManager(DEFAULT_CONFIG, setConfig);
			console.log(DEFAULT_CONFIG)
			// Try to load saved config from localStorage
			configManagerRef.current.loadFromStorage();
			console.log(configManagerRef.current.getConfig());
		}

		if (!toolSystemRef.current) {
			toolSystemRef.current = new ToolSystem(
				setViewport,
				setSelectedAnnotationIDs,
				configManagerRef.current,
				setCurrentTool,
				setCurrentAnnotationClass
			);

			setCurrentTool(toolSystemRef.current.currentTool);
		}
	}, [setViewport]);

	useEffect(() => {
		if (toolSystemRef.current) {
			toolSystemRef.current.viewport = viewport;
		}
	}, [viewport]);

	// Update keybinds when config changes
	useEffect(() => {
		if (toolSystemRef.current) {
			toolSystemRef.current.updateKeybinds();
		}
	}, [config]);

	const toolSystem = toolSystemRef.current;
	const configManager = configManagerRef.current;

	// Set the current image in toolSystem when loaded
	useEffect(() => {
		console.log('Called');
		if (imageFiles === null) {
			return;
		}

		const img = new Image();
		img.onload = () => {
			setImage(img);
			setIsImageLoaded(true);

			// TODO: make state bettererer
			setCurrentImageId(img.src);
			if (toolSystem) {
				toolSystem.currentImageId = img.src;
			}
		};
		img.onerror = () => {
			console.error("Failed to load image.");
		};

		img.src = URL.createObjectURL(imageFiles[0])

		return () => {
			img.onload = null;
			img.onerror = null;
		};
	}, [imageFiles]);

	/**
	 * Load all newly selected models.
	 * @param models List of currently selected models
	 */
	const handleModelSelect = async (models: string[]) => {
		// Load newly selected models
		console.log(availableModels);
		for (let i = 0; i < models.length; i++) {
			const modelName= models[i];
			// If already loaded, ignore
			if (!loadedModels[modelName]) {
				const modelPath = availableModels[modelName];

				console.log(modelPath);
				const session = (await model_loader('wasm', modelPath, { input_shape: [1, 3, 800, 800] })).yolo_model;
				setLoadedModels(prev => ({ ...prev, [modelName]: session }));
			}
		}

		// Unload deselected models
		for (const modelName of Object.keys(loadedModels)) {
			if (!models.includes(modelName)) {
				// Dispose session on deload
				setLoadedModels(prev => {
					const copy = { ...prev };
					copy[modelName].release();
					delete copy[modelName];

					return copy;
				});
			}
		}

		setSelectedModels(models);
	};

	/**
	 * Load custom user uploaded ONNX CNN model.
	 * @param file File representing model
	 */
	const handleCustomModelUpload = (file: File) => {
		const customModelName = `Custom: ${file.name}`;
		
		setAvailableModels(prev => ({
			...prev, 
			[customModelName]: URL.createObjectURL(file) 
		}));

		// NOTE: doesn't properly pass state, since availableModels isn't updated immediately.
		//		 could re-add, but not dire.
		// handleModelSelect([...selectedModels, customModelName]);
	};

	/**
	 * Runs all currently loaded ONNX models over currently loaded image in series.
	 * Creates new annotations for detected bounding boxes via onnx/inference_pipeline.
	 */
	const handlePrepocessors = async () => {
		// TODO: preload model on select
		// TODO: prevent multiple cnn inference passes on single image
		if (!image || !configManager) return;

		for (let i = 0; i < selectedModels.length; i++) {
			const model = loadedModels[selectedModels[i]];
			if (!model) continue;
			const [results, time] = await inference_pipeline(image, { yolo_model: model });

			console.log('Time:', time);
			console.log(results);

			// Create new annotation
			for (const result of results) {
				const [x, y, w, h] = result.bbox;
				const annotation = new Annotation('rectangle', [{ x, y }, { x: x + w, y: y + h }], [], 'tile');
				toolSystem?.addAnnotation(annotation);
			}
		}
	};

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

	const handleToolSelect = (tool: ToolBase) => {
		if (toolSystem) {
			toolSystem.setCurrentTool(tool);
		}
	};

	return (
		<div className='flex-col flex'>
			<Filebar
				setImageFiles={setImageFiles}
				configManager={configManagerRef.current}
				toolSystem={toolSystemRef.current}
				currentAnnotationClass={currentAnnotationClass}
				availableModels={availableModels}
				selectedModels={selectedModels}
				onModelSelect={handleModelSelect}
				onCustomModelUpload={handleCustomModelUpload}
				onPreprocess={handlePrepocessors}
			/>
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
						{image && toolSystem && configManager &&
							(<Canvas
								image={image}
								currentImageId={currentImageId}
								backgroundColor={'#3B3B3B'}
								toolSystem={toolSystem}
								configManager={configManager}
								viewport={viewport}
							/>
							)}
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
