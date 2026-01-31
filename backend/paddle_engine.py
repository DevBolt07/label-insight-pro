import logging
import base64
import numpy as np
import cv2
from paddleocr import PaddleOCR
from pydantic import BaseModel
from typing import List, Tuple

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PaddleOCRLine(BaseModel):
    text: str
    confidence: float
    box: List[List[str]]  # Using string/float mixed types can be tricky, let's strictly define.
                          # Actually, coordinates are floats/ints. 
                          # Users requested [[x,y],...]
    box: List[List[float]]

class PaddleOCRResponse(BaseModel):
    lines: List[PaddleOCRLine]

class PaddleEngine:
    def __init__(self):
        self.ocr = None
        self._initialize_model()

    def _initialize_model(self):
        try:
            logger.info("Loading PaddleOCR model...")
            # use_angle_cls=True for angle classification
            # lang='en' for English
            self.ocr = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)
            logger.info("PaddleOCR model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load PaddleOCR model: {e}")
            self.ocr = None

    def process_base64(self, base64_string: str) -> PaddleOCRResponse:
        if not self.ocr:
            # Try to re-init if it failed previously or wasn't loaded
            self._initialize_model()
            if not self.ocr:
                raise RuntimeError("PaddleOCR model is not active.")

        # Decode Base64
        if "," in base64_string:
            base64_string = base64_string.split(",")[1]
        
        try:
            img_bytes = base64.b64decode(base64_string)
            np_arr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        except Exception as e:
            raise ValueError(f"Invalid image data: {e}")

        if img is None:
            raise ValueError("Could not decode image.")

        # Run OCR
        # result is a list of [ [box, [text, score]] ]
        # PaddleOCR returns a list of results (one per image passed). We passed one image.
        result = self.ocr.ocr(img, cls=True)

        if not result or result[0] is None:
            return PaddleOCRResponse(lines=[])

        lines = []
        for line in result[0]:
            # line structure: [ [[x1,y1],[x2,y2],[x3,y3],[x4,y4]], (text, confidence) ]
            box = line[0]
            text, score = line[1]
            
            # Ensure box coordinates are floats/ints
            clean_box = [[float(coord[0]), float(coord[1])] for coord in box]

            lines.append(PaddleOCRLine(
                text=text,
                confidence=round(score, 4),
                box=clean_box
            ))

        return PaddleOCRResponse(lines=lines)

# Create a singleton instance
paddle_engine = PaddleEngine()
