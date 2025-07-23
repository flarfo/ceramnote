import { useState, useEffect, useRef, useCallback, type KeyboardEvent } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import Canvas from './components/Canvas';
import ToolSystem from './tools/ToolSystem';
import { Toolbar } from './tools/ToolSystem';
import { Inspector } from './components/Inspector'
import { AnnotationScrollbar } from './components/AnnotationScrollbar'
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
import { LoadingBar } from './components/LoadingBar';

/**
 * App component; base rendering point, handles cross-component state. 
 */
function App() {
	// Images
	const [image, setImage] = useState<HTMLImageElement | null>(null); // Current loaded image
	const [imageFiles, setImageFiles] = useState<FileList | null>(null); // All image files (if multiple selected)
	const [isImageLoaded, setIsImageLoaded] = useState(false);
	const [isImageTransitioning, setIsImageTransitioning] = useState(false);
	const [currentImageIndex, setCurrentImageIndex] = useState(0);

	// Annotations
	const [annotations, setAnnotations] = useState<{ [imageIndex: number]: { [id: string]: Annotation } }>({});
	const [selectedAnnotationIDs, setSelectedAnnotationIDs] = useState<string[]>([]);
	const [currentAnnotationClass, setCurrentAnnotationClass] = useState<string>('');

	// Models
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

	// Exports
	const [isExporting, setIsExporting] = useState(false);
	const [currentExportIndex, setCurrentExportIndex] = useState(0);
	const [totalExportSteps, setTotalExportSteps] = useState(0);
	const [currentExportStep, setCurrentExportStep] = useState('');
	const [currentExportSubStep, setCurrentExportSubStep] = useState('');

	// Misc
	const [panelSize, setPanelSize] = useState(80);
	const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
	const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
	const [currentTool, setCurrentTool] = useState<ToolBase | null>(null);
	const [canvasKey, setCanvasKey] = useState(0);

	// Refs
	const toolSystemRef = useRef<ToolSystem | null>(null);
	const configManagerRef = useRef<ConfigManager | null>(null);

	// Initialize ConfigManager and ToolSystem after setViewport is available
	useEffect(() => {
		if (!configManagerRef.current) {
			configManagerRef.current = new ConfigManager(DEFAULT_CONFIG, setConfig);
			// Try to load saved config from localStorage
			configManagerRef.current.loadFromStorage();
		}

		if (!toolSystemRef.current) {
			toolSystemRef.current = new ToolSystem(
				annotations,
				selectedAnnotationIDs,
				currentImageIndex,
				setAnnotations,
				setSelectedAnnotationIDs,
				setViewport,
				configManagerRef.current,
				setCurrentTool,
				setCurrentAnnotationClass
			);

			setCurrentTool(toolSystemRef.current.currentTool);
		}
	}, [setViewport]);

	const handleImageNavigation = (num: number) => {
		if (!imageFiles?.length) return;

		const newIndex = currentImageIndex + num;
		if (newIndex < 0 || newIndex > imageFiles.length - 1) return;
		setIsImageTransitioning(true);
		setCurrentImageIndex(prev => prev + num);
	};

	useEffect(() => {
		let resizeTimeout: number | undefined;

		const handleResize = () => {
			if (resizeTimeout) clearTimeout(resizeTimeout);
			// Debounce: only trigger after resizing has stopped for 200ms
			resizeTimeout = window.setTimeout(() => {
				setCanvasKey(k => k + 1);
			}, 200);
		};

		window.addEventListener('resize', handleResize);
		return () => {
			window.removeEventListener('resize', handleResize);
			if (resizeTimeout) clearTimeout(resizeTimeout);
		};
	}, []);

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

	useEffect(() => {
		if (toolSystemRef.current) {
			toolSystemRef.current.annotations = annotations;
		}
	}, [annotations]);

	useEffect(() => {
		if (toolSystemRef.current) {
			toolSystemRef.current.selectedAnnotationIDs = selectedAnnotationIDs;
		}
	}, [selectedAnnotationIDs]);

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

	const uploadImages = (images: FileList) => {
		setAnnotations({});
		setCurrentImageIndex(0);
		setImageFiles(images);
	}

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
	const handlePreprocessors = useCallback(async () => {
		if (!image || isImageTransitioning) return;

		// TODO: prevent multiple preprocess passes from occuring on an image
		let newAnnotations: { [id: string]: Annotation } = {};
		for (let i = 0; i < selectedModels.length; i++) {
			const model = loadedModels[selectedModels[i]];
			if (!model) continue;
			const [results, time] = await inference_pipeline(image, { yolo_model: model });

			for (const result of results) {
				const [x, y, w, h] = result.bbox;
				const annotation = new Annotation('rectangle', [{ x, y }, { x: x + w, y: y + h }], [], 'tile');
				newAnnotations[annotation.id] = annotation;
			}
		}

		setAnnotations(prev => ({
			...prev,
			[currentImageIndex]: {
				...newAnnotations
			}
		}));
	}, [image, isImageTransitioning, selectedModels, loadedModels, currentImageIndex, setAnnotations]);

	// Rebuild annotation grid (used for navigation) on new select
	useEffect(() => {
		if (toolSystemRef.current) {
			toolSystemRef.current.buildAnnotationGrid();
		}
	}, [annotations, currentImageIndex, selectedAnnotationIDs]);

	// Global keyboard event handler
	useEffect(() => {
		const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
			if (e.key === ' ') {
				handlePreprocessors();
			}
		};

		const handleGlobalKeyUp = (e: globalThis.KeyboardEvent) => {
			const activeElement = document.activeElement;
			const isTyping = activeElement && (
				activeElement.tagName === 'INPUT' ||
				activeElement.tagName === 'TEXTAREA' ||
				activeElement.getAttribute('contenteditable') === 'true'
			);

			if (isTyping) {
				// Avoid navigation when typing
				return;
			}

			// Check if Ctrl key is held for image navigation
			if (e.ctrlKey) {
				if (e.key === 'ArrowRight') {
					handleImageNavigation(1);
				}
				else if (e.key === 'ArrowLeft') {
					handleImageNavigation(-1);
				}
			} else if (toolSystem) {
				// Arrow keys without Ctrl navigate annotations
				if (e.key === 'ArrowUp') {
					toolSystem.navigateAnnotationGrid('up');
				}
				else if (e.key === 'ArrowDown') {
					toolSystem.navigateAnnotationGrid('down');
				}
				else if (e.key === 'ArrowLeft') {
					toolSystem.navigateAnnotationGrid('left');
				}
				else if (e.key === 'ArrowRight') {
					toolSystem.navigateAnnotationGrid('right');
				}
				else if (e.key === 'Delete') {
					toolSystem.removeAnnotation(toolSystem.selectedAnnotationIDs[0])
				}
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
	}, [imageFiles, currentImageIndex, isImageTransitioning, handlePreprocessors]);

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
		if (!imageFiles) return;

		setIsExporting(true);
		setCurrentExportIndex(0);
		setCurrentExportStep('Preparing export...');
		setCurrentExportSubStep('');

		try {
			// Create new zip folder to store all data
			const zip = new JSZip();

			// Get current index starting point 
			const iterations = onlyCurrent ? 1 : imageFiles.length;
			const startIndex = onlyCurrent ? currentImageIndex : 0;

			// Calculate information for export loading bar
			let totalSteps = 0;
			for (let i = startIndex; i < (onlyCurrent ? startIndex + 1 : iterations); i++) {
				totalSteps += Object.keys(annotations[i] || {}).length;
			}

			setTotalExportSteps(totalSteps);
			let currentStepIndex = 0;

			for (let i = startIndex; i < (onlyCurrent ? startIndex + 1 : iterations); i++) {
				// Get the original image name (without extension)
				const file = imageFiles[i];
				const imageName = file.name.replace(/\.[^/.]+$/, "");
				// Create a folder for this image
				const imageFolder = zip.folder(imageName);
				const imagesFolder = imageFolder?.folder('images');
				const annotationsData: { annotation: any; imageUrl: string }[] = [];

				// Store the original image in the folder
				const originalExt = file.name.split('.').pop() || 'jpg';
				imageFolder?.file(`${imageName}.${originalExt}`, file);

				// Load the image for this iteration if it's not the current one
				let imageToProcess = image;
				if (!onlyCurrent && i !== currentImageIndex) {
					setCurrentExportStep(`Loading image ${i + 1} of ${imageFiles.length}...`);
					imageToProcess = await new Promise<HTMLImageElement>((resolve, reject) => {
						const tempImg = new Image();
						tempImg.onload = () => resolve(tempImg);
						tempImg.onerror = reject;
						tempImg.src = URL.createObjectURL(imageFiles[i]);
					});
				}

				if (!imageToProcess) continue;

				const annots = Object.values(annotations[i] || []);
				setCurrentExportStep(`Processing image ${i + 1} of ${imageFiles.length} (${annots.length} annotations)`);

				for (const annotation of annots) {
					currentStepIndex++;
					setCurrentExportIndex(currentStepIndex);
					setCurrentExportSubStep(annotation.id);

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

							const url = URL.createObjectURL(blob);
							const fac = new FastAverageColor();

							// Color calculation
							try {
								const color: FastAverageColorResult = await fac.getColorAsync(url, { algorithm: 'dominant' });
								const color_string = color.rgb.split(/[,()]/);
								const red = parseFloat(color_string[1]);
								const green = parseFloat(color_string[2]);
								const blue = parseFloat(color_string[3]);
								const lab = rgbToLab({ red, green, blue });
								annotation.color_data.ColorL = lab.luminance;
								annotation.color_data.ColorA = lab.a;
								annotation.color_data.ColorB = lab.b;
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

				// Add the JSON file to the image's folder
				imageFolder?.file('annotations.json', JSON.stringify(annotationsData, null, 2));
			}

			setCurrentExportStep('Generating ZIP file...');
			setCurrentExportSubStep('');

			// Generate the ZIP file and trigger download
			const zipBlob = await zip.generateAsync({ type: 'blob' });
			const zipUrl = URL.createObjectURL(zipBlob);

			const formData = new FormData();
			formData.append('file', zipBlob, 'annotations.zip');

			await fetch("http://localhost:8000/upload", {
				method: "POST",
				body: formData,
			});

			/*const a = document.createElement('a');
			a.href = zipUrl;
			a.download = 'annotations.zip';
			a.click();
			URL.revokeObjectURL(zipUrl);*/

			setCurrentExportStep('Export complete!');
		}
		catch (error) {
			console.error('Export failed:', error);
			setCurrentExportStep('Export failed');
		}
		finally {
			// Hide LoadingBar after export completes
			setTimeout(() => setIsExporting(false), 2000);
		}
	};

	return (
		<div className='flex-col flex'>
			<LoadingBar
				isExporting={isExporting}
				index={currentExportIndex}
				numSteps={totalExportSteps}
				currentStep={currentExportStep}
				subStep={currentExportSubStep}
			/>
			<Filebar
				setImageFiles={uploadImages}
				configManager={configManagerRef.current}
				toolSystem={toolSystemRef.current}
				currentAnnotationClass={currentAnnotationClass}
				availableModels={availableModels}
				selectedModels={selectedModels}
				onModelSelect={handleModelSelect}
				onCustomModelUpload={handleCustomModelUpload}
				onPreprocess={handlePreprocessors}
				onExportAll={exportAllAnnotations}
				onExportCurrent={exportCurrentAnnotations}
			/>
			<PanelGroup direction="horizontal" style={{ height: '100vh' }}>
				<Panel defaultSize={15} minSize={10} className='bg-(--color-medium) min-h-0 h-full'>
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
								key={canvasKey} // Force re-render when image changes
								image={image}
								currentImageIndex={currentImageIndex}
								backgroundColor={'#3B3B3B'}
								toolSystem={toolSystem}
								configManager={configManager}
								viewport={viewport}
								annotations={annotations}
								selectedAnnotationIDs={selectedAnnotationIDs}
							/>
						) :
							<Canvas
								key={canvasKey}
								image={null} // Render just the background
								currentImageIndex={-1}
								backgroundColor={'#3B3B3B'}
								toolSystem={toolSystem}
								configManager={configManager}
								viewport={viewport}
								annotations={annotations}
								selectedAnnotationIDs={selectedAnnotationIDs}
							/>
						)}
					</div>
				</Panel>
				<PanelResizeHandle style={{ width: '4px', background: '#ccc' }} />
				<Panel defaultSize={10} minSize={5} className='bg-(--color-medium)'>
					<AnnotationScrollbar
						imageFiles={imageFiles}
						currentImageIndex={currentImageIndex}
						annotations={annotations}
						onImageChange={(index) => {
							if (index === currentImageIndex) return;
							setIsImageTransitioning(true);
							setCurrentImageIndex(index);
						}}
					/>
				</Panel>
			</PanelGroup>
		</div>
	);
}

export default App;
