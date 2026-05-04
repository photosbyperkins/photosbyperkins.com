import os
import json
import cv2
import numpy as np
import urllib.request
import concurrent.futures
import threading
import multiprocessing

def download_model_files():
    model_dir = os.path.join('data', 'models')
    os.makedirs(model_dir, exist_ok=True)
    
    prototxt_path = os.path.join(model_dir, 'deploy.prototxt')
    model_path = os.path.join(model_dir, 'res10_300x300_ssd_iter_140000.caffemodel')
    
    prototxt_url = "https://raw.githubusercontent.com/opencv/opencv/master/samples/dnn/face_detector/deploy.prototxt"
    model_url = "https://raw.githubusercontent.com/opencv/opencv_3rdparty/dnn_samples_face_detector_20170830/res10_300x300_ssd_iter_140000.caffemodel"
    
    if not os.path.exists(prototxt_path):
        print("Downloading DNN Prototxt...")
        urllib.request.urlretrieve(prototxt_url, prototxt_path)
        
    if not os.path.exists(model_path):
        print("Downloading DNN Caffe Model (2.5MB)...")
        urllib.request.urlretrieve(model_url, model_path)
        
    return prototxt_path, model_path

prototxt_path, model_path = download_model_files()

thread_local = threading.local()

cv2.ocl.setUseOpenCL(True)

def get_net():
    if not hasattr(thread_local, "net"):
        net = cv2.dnn.readNetFromCaffe(prototxt_path, model_path)
        net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
        net.setPreferableTarget(cv2.dnn.DNN_TARGET_OPENCL)
        thread_local.net = net
    return thread_local.net

def weighted_median(values, weights):
    pass # Deprecated in favor of single best face

def get_focus(image_path):
    try:
        img_data = np.fromfile(image_path, dtype=np.uint8)
        img = cv2.imdecode(img_data, cv2.IMREAD_COLOR)
        
        if img is None:
            return None, None, 0.0, 0.0
            
        img_h, img_w = img.shape[:2]
        
        scale = 640.0 / img_w
        if scale < 1.0:
            small_w, small_h = int(img_w * scale), int(img_h * scale)
            detect_img = cv2.resize(img, (small_w, small_h))
        else:
            detect_img = img
            scale = 1.0
            
        h, w = detect_img.shape[:2]
        blob = cv2.dnn.blobFromImage(detect_img, 1.0, (300, 300), (104.0, 177.0, 123.0))
        
        net = get_net()
        net.setInput(blob)
        detections = net.forward()
        
        all_faces = []
        for i in range(0, detections.shape[2]):
            confidence = detections[0, 0, i, 2]
            if confidence > 0.4:
                box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
                (startX, startY, endX, endY) = box.astype("int")
                
                startX = max(0, startX)
                startY = max(0, startY)
                endX = min(w, endX)
                endY = min(h, endY)
                
                face_w = endX - startX
                face_h = endY - startY
                
                if face_w > 10 and face_h > 10:
                    all_faces.append((startX, startY, face_w, face_h, confidence))
            
        if len(all_faces) > 0:
            orig_gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if scale < 1.0 else cv2.cvtColor(detect_img, cv2.COLOR_BGR2GRAY)
            
            native_path = image_path.replace(os.path.join('build', 'thumbnails'), os.path.join('build', 'processed'), 1)
            native_img = None
            if os.path.exists(native_path):
                native_data = np.fromfile(native_path, dtype=np.uint8)
                native_img = cv2.imdecode(native_data, cv2.IMREAD_GRAYSCALE)
                
            sharpness_source = native_img if native_img is not None else orig_gray
            h_src, w_src = sharpness_source.shape[:2]
            
            best_face = None
            max_weight = -1
            
            best_recap_face = None
            max_recap_weight = -1
            
            for (sx, sy, sw, sh, confidence) in all_faces:
                x = sx / scale
                y = sy / scale
                face_w = sw / scale
                face_h = sh / scale
                
                cx = (x + face_w / 2.0) / img_w
                cy = (y + face_h / 2.0) / img_h
                
                src_x = int(cx * w_src - (face_w / img_w / 2.0 * w_src))
                src_y = int(cy * h_src - (face_h / img_h / 2.0 * h_src))
                src_w = int((face_w / img_w) * w_src)
                src_h = int((face_h / img_h) * h_src)
                
                face_roi = sharpness_source[max(0, src_y):min(h_src, src_y+src_h), max(0, src_x):min(w_src, src_x+src_w)]
                if face_roi.size == 0:
                    continue
                    
                sharpness = cv2.Laplacian(face_roi, cv2.CV_64F).var()
                normalized_area = (face_w * face_h) / (img_w * img_h)
                
                # The final recap slice is cropped to a 1:4 aspect ratio.
                # For most photos, the slice width is 25% of the image HEIGHT.
                crop_ratio = 1.0 / 4.0
                crop_w = img_h * crop_ratio if (img_w / img_h) > crop_ratio else img_w
                
                # Reject faces that are extremely small (likely distant background faces)
                if face_w / img_w < 0.05:
                    continue
                
                dist_from_center_x = abs(cx - 0.5)
                dist_from_center_y = abs(cy - 0.5)
                center_penalty = 1.0 - (dist_from_center_x * 0.5 + dist_from_center_y * 0.5)
                
                weight = sharpness * (normalized_area ** 0.5) * float(confidence) * center_penalty
                
                # --- Lightbox/Portfolio Algorithm (Lenient) ---
                if weight > max_weight:
                    max_weight = weight
                    adjusted_cy = max(0.0, cy - (face_h / img_h * 0.5))
                    best_face = (cx, adjusted_cy)
                    
                # --- Recap Algorithm (Strict) ---
                # Reject faces that are wider than 55% of the slice width to prevent horizontal clipping
                # (bounding box only covers inner face, so we need ample room for the rest of the head)
                if face_w > crop_w * 0.55:
                    continue

                # Reject faces that cannot be perfectly centered because they are too close to the edge.
                # If they are too close to the edge, the crop window clamps, pushing the face off-center.
                min_cx = (crop_w / 2.0) / img_w
                max_cx = 1.0 - min_cx
                if cx < min_cx or cx > max_cx:
                    continue

                if weight > max_recap_weight:
                    max_recap_weight = weight
                    adjusted_cy = max(0.0, cy - (face_h / img_h * 0.5))
                    best_recap_face = (cx, adjusted_cy)
                
            if best_face is not None:
                total_faces = len(all_faces)
                
                # Lightbox/Portfolio Score (No multiple face penalty)
                image_score = float(max_weight)
                
                # Recap Score (Strict multiple face penalty)
                penalty_factor = float(total_faces ** 4.0)
                recap_score = float(max_recap_weight) / penalty_factor if total_faces > 0 and best_recap_face is not None else 0.0
                
                # Use best_face coordinates for general focus
                return float(best_face[0]), float(best_face[1]), image_score, recap_score
                
    except Exception as e:
        print(f"Error processing {image_path}: {e}")
        
    return None, None, 0.0, 0.0

def main():
    data_dir = 'data'
    photos_file = os.path.join(data_dir, 'photos.json')
    cache_file = os.path.join(data_dir, '.faces_cache.json')
    
    if not os.path.exists(photos_file):
        print("photos.json not found.")
        return
        
    with open(photos_file, 'r', encoding='utf-8') as f:
        photos_data = json.load(f)
        
    cache_data = {}
    
    # Gracefully port existing face data
    old_faces_cache = os.path.join(data_dir, 'faces.json')
    if os.path.exists(old_faces_cache):
        try:
            with open(old_faces_cache, 'r', encoding='utf-8') as f:
                cache_data = json.load(f)
            import shutil
            shutil.move(old_faces_cache, cache_file)
        except Exception:
            pass
            
    if os.path.exists(cache_file):
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                cache_data = json.load(f)
        except json.JSONDecodeError:
            pass
            
    print("Scanning photos.json for face tracking injection...")
    
    processed_count = 0
    found_count = 0
    skipped_count = 0
    paths_to_process = []
    
    for year, events in photos_data.items():
        for event_name, event_data in events.items():
            for list_key in ['album', 'highlights']:
                if list_key in event_data:
                    for photo in event_data[list_key]:
                        if isinstance(photo, str):
                            continue
                            
                        thumb_web_path = photo.get('thumb')
                        if not thumb_web_path:
                            continue
                            
                        local_thumb_path = os.path.join('build', thumb_web_path.lstrip('/'))
                        
                        if thumb_web_path in cache_data:
                            val = cache_data[thumb_web_path]
                            if val is not None and isinstance(val, dict) and "score" in val:
                                if "x" in val:
                                    photo['focusX'] = val['x']
                                    photo['focusY'] = val['y']
                                    found_count += 1
                                photo['faceScore'] = val['score']
                                photo['recapScore'] = val.get('recapScore', 0.0)
                                skipped_count += 1
                                continue
                            
                        if os.path.exists(local_thumb_path):
                            paths_to_process.append((photo, thumb_web_path, local_thumb_path))
                        else:
                            cache_data[thumb_web_path] = None
                            
    def process_image(item):
        photo, thumb_web_path, local_thumb_path = item
        fx, fy, score, recap_score = get_focus(local_thumb_path)
        return photo, thumb_web_path, fx, fy, score, recap_score

    if paths_to_process:
        print(f"Processing {len(paths_to_process)} new images concurrently...")
        threads = min(32, (multiprocessing.cpu_count() or 1) * 2)
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=threads) as executor:
            future_to_item = {executor.submit(process_image, item): item for item in paths_to_process}
            
            for future in concurrent.futures.as_completed(future_to_item):
                photo, thumb_web_path, fx, fy, score, recap_score = future.result()
                
                if fx is not None:
                    cache_data[thumb_web_path] = {"x": fx, "y": fy, "score": score, "recapScore": recap_score}
                    photo['focusX'] = fx
                    photo['focusY'] = fy
                    photo['faceScore'] = score
                    photo['recapScore'] = recap_score
                    found_count += 1
                else:
                    cache_data[thumb_web_path] = {"score": score, "recapScore": recap_score}
                    photo['faceScore'] = score
                    
                processed_count += 1
                if processed_count % 100 == 0:
                    print(f"  Processed {processed_count}/{len(paths_to_process)} images... ({found_count} faces tracked so far)")
                            
    # Second pass: Select the best hero image for each event based on faceScore
    print("Selecting optimal hero images for each event...")
    for year, events in photos_data.items():
        for event_name, event_data in events.items():
            candidates = event_data.get('highlights', [])
            if not candidates:
                candidates = event_data.get('album', [])
                
            if candidates:
                best_photo = None
                best_score = -1.0
                
                for photo in candidates:
                    if isinstance(photo, str):
                        continue
                    score = photo.get('faceScore', 0.0)
                    if score > best_score:
                        best_score = score
                        best_photo = photo
                        
                if best_photo:
                    # Strip out full album-level metadata so we only store the essentials for the hero
                    event_data['hero'] = {
                        'src': best_photo.get('src') or best_photo.get('original'),
                        'focusX': best_photo.get('focusX'),
                        'focusY': best_photo.get('focusY')
                    }

    with open(photos_file, 'w', encoding='utf-8') as f:
        json.dump(photos_data, f, indent=2)
        
    with open(cache_file, 'w', encoding='utf-8') as f:
        json.dump(cache_data, f, indent=2)
        
    print(f"\nFace detection complete. Skipped: {skipped_count}, Processed: {processed_count}. Total faces tracked: {found_count}")

if __name__ == "__main__":
    main()
