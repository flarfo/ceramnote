import { useState, useEffect, useRef, useCallback, type KeyboardEvent } from 'react';
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
import { FastAverageColor, type FastAverageColorResult } from 'fast-average-color';
import rgbToLab from '@fantasy-color/rgb-to-lab'
import JSZip from 'jszip';

/**
 * App component; base rendering point, handles cross-component state. 
 */
function App() {
	const [image, setImage] = useState<HTMLImageElement | null>(null); // Current loaded image
	// TODO: allow user to switch to new image from list of all uploaded
	const [imageFiles, setImageFiles] = useState<FileList | null>(null); // All image files (if multiple selected)
	const [isImageLoaded, setIsImageLoaded] = useState(false);
	const [isImageTransitioning, setIsImageTransitioning] = useState(false);
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

	const [currentImageIndex, setCurrentImageIndex] = useState(0);

	// Initialize ConfigManager and ToolSystem after setViewport is available
	useEffect(() => {
		if (!configManagerRef.current) {
			configManagerRef.current = new ConfigManager(DEFAULT_CONFIG, setConfig);
			// Try to load saved config from localStorage
			configManagerRef.current.loadFromStorage();
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

	// Global keyboard event handler
	useEffect(() => {
		const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
			if (e.key === ' ') {
				handlePrepocessors();
			}
		};

		const handleGlobalKeyUp = (e: globalThis.KeyboardEvent) => {
			if (e.key === 'ArrowRight') {
				handleImageNavigation(1);
			}
			else if (e.key === 'ArrowLeft') {
				handleImageNavigation(-1);
			}
		};

		// Add event listeners to document
		document.addEventListener('keydown', handleGlobalKeyDown);
		document.addEventListener('keyup', handleGlobalKeyUp);

		// Cleanup event listeners on unmount
		return () => {
			document.removeEventListener('keydown', handleGlobalKeyDown);
			document.removeEventListener('keyup', handleGlobalKeyUp);
		};
	}, [imageFiles, currentImageIndex, isImageTransitioning]);

	const handleImageNavigation = (num: number) => {
		if (!imageFiles?.length) return;

		const newIndex = currentImageIndex + num;
		if (newIndex < 0 || newIndex > imageFiles.length - 1) return;
		setIsImageTransitioning(true);
		setCurrentImageIndex(prev => prev + num);
	};

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
	// TODO: fix wonky state management
	useEffect(() => {
		if (imageFiles === null) {
			return;
		}

		const img = new Image();
		img.onload = () => {
			setImage(img);
			setIsImageLoaded(true);

			// Update toolSystem with the current image index
			if (toolSystem) {
				toolSystem.setCurrentImage(currentImageIndex);
			}

			// Clear the transitioning state after everything is set up
			setIsImageTransitioning(false);
		};
		img.onerror = () => {
			console.error("Failed to load image.");
		};

		img.src = URL.createObjectURL(imageFiles[currentImageIndex])

		return () => {
			img.onload = null;
			img.onerror = null;
		};
	}, [imageFiles, currentImageIndex]);

	/**
	 * Load all newly selected models.
	 * @param models List of currently selected models
	 */
	const handleModelSelect = async (models: string[]) => {
		// Load newly selected models
		console.log(availableModels);
		for (let i = 0; i < models.length; i++) {
			const modelName = models[i];
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
		if (!image || !configManager || isImageTransitioning) return;


		for (let i = 0; i < selectedModels.length; i++) {
			const model = loadedModels[selectedModels[i]];
			if (!model) continue;
			const [results, time] = await inference_pipeline(image, { yolo_model: model });

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
			toolSystem.setCurrentImage(currentImageIndex);

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

	const exportCurrentAnnotations = () => exportAnnotations(true);
	const exportAllAnnotations = () => exportAnnotations(false);

	/**
 	* Saves all images to annotations.zip/images and all annotations to annotations.zip/annotations.json.
	* Save code found in Annotation.save() [<-- TO IMPLEMENT]
	*/
	const exportAnnotations = async (onlyCurrent: boolean) => {
		if (!imageFiles || !toolSystem) return;

		// Create new zip folder to store all data
		const zip = new JSZip();
		const imagesFolder = zip.folder('images');
		const annotationsData: { annotation: any; imageUrl: string }[] = [];

		// Get current index starting point 
		const iterations = onlyCurrent ? 1 : imageFiles.length;
		const startIndex = onlyCurrent ? currentImageIndex : 0;

		for (let i = startIndex; i < (onlyCurrent ? startIndex + 1 : iterations); i++) {
			// Load the image for this iteration if it's not the current one
			let imageToProcess = image;
			if (!onlyCurrent && i !== currentImageIndex) {
				// Create a temporary image for non-current images
				imageToProcess = await new Promise<HTMLImageElement>((resolve, reject) => {
					const tempImg = new Image();
					tempImg.onload = () => resolve(tempImg);
					tempImg.onerror = reject;
					tempImg.src = URL.createObjectURL(imageFiles[i]);
				});
			}

			if (!imageToProcess) continue;

			const annots = Object.values(toolSystem.annotations[i] || []);
			for (const annotation of annots) {
				// TODO: Move save function to the object itself ?
				if (annotation.bounds && annotation.bounds.length === 2) {
					const [start, end] = annotation.bounds;

					// Calculate crop dimensions
					const x = Math.min(start.x, end.x);
					const y = Math.min(start.y, end.y);
					const width = Math.abs(end.x - start.x);
					const height = Math.abs(end.y - start.y);

					// Create a temporary canvas for the crop
					const cropCanvas = document.createElement('canvas');
					cropCanvas.width = width;
					cropCanvas.height = height;

					const cropContext = cropCanvas.getContext('2d');
					if (!cropContext) continue;

					// Draw the cropped image onto temp canvas
					cropContext.drawImage(imageToProcess, x, y, width, height, 0, 0, width, height);

					// Get cropped image URL
					// NOTE: blob MIME type MUST match original image MIME type, or size is MASSIVELY inflated (~5x)
					// TODO: track MIME type of original image so multiple filetypes are supported
					const blob = await new Promise<Blob | null>((resolve) => cropCanvas.toBlob(resolve, 'image/jpeg', 0.95));
					if (blob) {
						const fileName = `${annotation.id}.jpg`;
						imagesFolder?.file(fileName, blob);

						// Gets the average color and adds to annotation
						const url = URL.createObjectURL(blob);
						const fac = new FastAverageColor();

						// Wait for color calculation to complete before proceeding
						try {
							const color: FastAverageColorResult = await fac.getColorAsync(url, { algorithm: 'dominant' });
							const color_string = color.rgb.split(/[,()]/);
							const red = parseFloat(color_string[1]);
							const green = parseFloat(color_string[2]);
							const blue = parseFloat(color_string[3]);
							const lab = rgbToLab({ red, green, blue });
							annotation.tile_data.ColorL = lab.luminance;
							annotation.tile_data.ColorA = lab.a;
							annotation.tile_data.ColorB = lab.b;
						}
						catch (error) {
							console.error('Error calculating color:', error);
						}

						// Clean up the blob URL
						URL.revokeObjectURL(url);

						// Add annotation data to JSON
						annotationsData.push({
							annotation: annotation.getData(),
							imageUrl: `images/${fileName}`
						});
					}
				}
			}
		}

		// Add the JSON file to the ZIP
		zip.file('annotations.json', JSON.stringify(annotationsData, null, 2));

		// Generate the ZIP file and trigger download
		const zipBlob = await zip.generateAsync({ type: 'blob' });
		const zipUrl = URL.createObjectURL(zipBlob);
		const a = document.createElement('a');
		a.href = zipUrl;
		a.download = 'annotations.zip';
		a.click();
		URL.revokeObjectURL(zipUrl);
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
				onExportAll={exportAllAnnotations}
				onExportCurrent={exportCurrentAnnotations}
			/>
			<PanelGroup direction="horizontal" style={{ height: '100vh' }}

			>
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
						{image && toolSystem && configManager && (!isImageTransitioning ? (
							<Canvas
								key={currentImageIndex} // Force re-render when image changes
								image={image}
								currentImageIndex={currentImageIndex}
								backgroundColor={'#3B3B3B'}
								toolSystem={toolSystem}
								configManager={configManager}
								viewport={viewport}
							/>
						) :
							<Canvas
								key={currentImageIndex}
								image={null} // Render just the background
								currentImageIndex={-1}
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
