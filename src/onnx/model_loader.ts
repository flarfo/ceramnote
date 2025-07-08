import * as ort from 'onnxruntime-web/wasm';

export const model_loader = async (device: string = 'wasm', model_path: string, config: { input_shape: number[] }) => {
    ort.env.wasm.wasmPaths = '/';

    // Load YOLO model
    let start = performance.now();
    const yolo_model = await ort.InferenceSession.create(model_path, {
        executionProviders: [device],
    });
    let end = performance.now();
    console.log(end - start);

    // Warm-up
    const dummy_input_tensor = new ort.Tensor(
        "float32",
        new Float32Array(config.input_shape.reduce((a, b) => a * b)),
        config.input_shape
    );

    start = performance.now();
    const { output0 } = await yolo_model.run({
        images: dummy_input_tensor
    });
    end = performance.now();
    console.log(end - start);
    
    output0.dispose();

    return { yolo_model };
};