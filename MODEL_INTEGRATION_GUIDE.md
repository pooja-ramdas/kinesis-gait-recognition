# 🚀 KINESIS: Model Integration Guide 🚀

Integrating your custom trained YOLO model (.ipynb) into the Kinesis production backend is the most critical step of this setup. 

We have specifically designed `backend/ai_engine/model.py` to act as the exact bridge between your notebook experiment and the production engine.

## Step 1: Locate Your Trained Model Weights
In your Jupyter Notebook, after training, you typically exported a `.pt` file (e.g., `best.pt` or `yolo_casia.pt`).
Copy this file into `backend/models/`. If the `models` folder doesn't exist, create it.
```bash
mkdir -p backend/models
cp /path/to/your/notebook/best.pt backend/models/yolo_casia.pt
```

## Step 2: Port Notebook Code to `model.py`
Open `backend/ai_engine/model.py`. You will see three main functions to update:

### A. `load_model()`
Find this section:
```python
# IN PRODUCTION: Remove this placeholder and strictly use your path.
self.model = YOLO('yolov8n.pt') 
```
Change it to match exactly how you loaded it in your notebook:
```python
self.model = YOLO('models/yolo_casia.pt')
# Or if it's a raw torch model:
# self.model = torch.load('models/yolo_casia.pt')
# self.model.eval()
```

### B. `preprocess()`
If your notebook explicitly resizes or normalizes frames before passing them to the model, copy that code inside the `preprocess` method. If YOLOv8 handles it directly, leave it as returning the raw frame.

### C. `predict()`
Find this section:
```python
results = self.model.predict(source=processed_frame, conf=0.5, verbose=False)
```
If your notebook required specific parameters (like `imgsz=640` or customized NMS), apply them here. Map the bounding boxes, confidence, class ID, and **ReID embeddings** (if your model outputs them) into the `detections` list dictionary.

## Step 3: Test Independently
Before running the full system, test *only* the model to ensure it loads and infers correctly:
1. Open a terminal.
2. Navigate to the `backend` folder.
3. Run the standalone test:
```bash
python -m ai_engine.model
```
If it prints `Model loaded successfully.` and `Detections found: 0` (on the dummy frame), your model is fully integrated into the Kinesis pipeline! The FastAPI backend will immediately begin using it.
