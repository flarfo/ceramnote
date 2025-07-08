import * as ort from "onnxruntime-web/wasm";

interface Prediction {
    bbox: number[],
    class_idx: number,
    score: number,
}

interface SessionConfig {
    yolo_model: ort.InferenceSession,
}

export const inference_pipeline = async (input_el: HTMLImageElement, sessionsConfig: SessionConfig): Promise<[Prediction[], string]> => {
    try {
        const [preProcessed, div_width, div_height] = preProcess_dynamic(input_el);

        const xRatio = input_el.width / div_width;
        const yRatio = input_el.height / div_height;

        const input_tensor = new ort.Tensor("float32", preProcessed, [
            1,
            3,
            div_height,
            div_width,
        ]);

        // inference
        const start = performance.now();
        const { output0 } = await sessionsConfig.yolo_model.run({
            images: input_tensor,
        });
        const end = performance.now();

        // post process
        const results = [];
        const [batch, attrs, num_anchors] = output0.dims;
        const confidenceThreshold = 0.7;

        // post process
        for (let i = 0; i < num_anchors; i++) {
            // Cast each value to number to avoid type errors
            const anchorData = new Float32Array([
                Number(output0.data[0 * num_anchors + i]),
                Number(output0.data[1 * num_anchors + i]),
                Number(output0.data[2 * num_anchors + i]),
                Number(output0.data[3 * num_anchors + i]),
                Number(output0.data[4 * num_anchors + i]),
            ]);

            const [x_center, y_center, width, height, score] = anchorData;

            if (score < confidenceThreshold) continue;

            const [x, y, w, h] = [
                (x_center - 0.5 * width) * xRatio,
                (y_center - 0.5 * height) * yRatio,
                width * xRatio,
                height * yRatio,
            ];

            results.push({
                bbox: [x, y, w, h],
                class_idx: 0,
                score: score,
            });
        }

        output0.dispose();
        //output_selected.dispose();
        const filtered = nms(results, 0.1);
        return [filtered, (end - start).toFixed(2)];
    }
    catch (err) {
        console.log(err);
        return [[], '0.0'];
    }
};


// Pre process and normalize input image.
const preProcess_dynamic = (input_el: HTMLImageElement): [Float32Array, number, number] => {
    const shrink = (800 / input_el.height);
    const width = Math.round(input_el.width * shrink);
    const height = Math.round(input_el.height * shrink);

    const [div_width, div_height] = divStride(32, width, height);

    const canvas = document.createElement('canvas');
    canvas.width = div_width;
    canvas.height = div_height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');

    ctx.drawImage(input_el, 0, 0, div_width, div_height);
    const imageData = ctx.getImageData(0, 0, div_width, div_height);
    const data = imageData.data; // [R,G,B,A,...] row-major

    // Convert to [C, H, W] and normalize
    const floatData = new Float32Array(3 * div_height * div_width);
    let p = 0;
    for (let y = 0; y < div_height; y++) {
        for (let x = 0; x < div_width; x++) {
            const idx = (y * div_width + x) * 4;
            floatData[0 * div_height * div_width + y * div_width + x] = data[idx] / 255;     // R
            floatData[1 * div_height * div_width + y * div_width + x] = data[idx + 1] / 255; // G
            floatData[2 * div_height * div_width + y * div_width + x] = data[idx + 2] / 255; // B
        }
    }

    return [floatData, div_width, div_height];
};

const divStride = (stride: number, width: number, height: number) => {
    width =
        width % stride >= stride / 2
            ? (Math.floor(width / stride) + 1) * stride
            : Math.floor(width / stride) * stride;

    height =
        height % stride >= stride / 2
            ? (Math.floor(height / stride) + 1) * stride
            : Math.floor(height / stride) * stride;

    return [width, height];
};

/**
 * Calculates Intersection over Union (IoU) between two bounding boxes.
 */
function iou(boxA: number[], boxB: number[]) {
    const [xA, yA, wA, hA] = boxA;
    const [xB, yB, wB, hB] = boxB;

    const x1 = Math.max(xA, xB);
    const y1 = Math.max(yA, yB);
    const x2 = Math.min(xA + wA, xB + wB);
    const y2 = Math.min(yA + hA, yB + hB);

    const interArea = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const boxAArea = wA * hA;
    const boxBArea = wB * hB;

    return interArea === 0 ? 0 : interArea / (boxAArea + boxBArea - interArea);
}

/**
 * Non-Maximum Suppression (NMS) for a list of predictions.
 * Returns filtered predictions.
 */
export function nms(predictions: Prediction[], iouThreshold: number = 0.5) {
    // Sort by descending score
    const sorted = [...predictions].sort((a, b) => b.score - a.score);
    const selected = [];

    while (sorted.length > 0) {
        const current = sorted.shift()!;
        selected.push(current);

        // Remove boxes with high IoU overlap (same class)
        for (let i = sorted.length - 1; i >= 0; i--) {
            if (
                current.class_idx === sorted[i].class_idx &&
                iou(current.bbox, sorted[i].bbox) > iouThreshold
            ) {
                sorted.splice(i, 1);
            }
        }
    }

    return selected;
}