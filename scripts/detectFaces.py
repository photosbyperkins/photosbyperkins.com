import os
import json
import cv2
import numpy as np

face_cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
profile_cascade_path = cv2.data.haarcascades + 'haarcascade_profileface.xml'

face_cascade = cv2.CascadeClassifier(face_cascade_path)
profile_cascade = cv2.CascadeClassifier(profile_cascade_path)

def weighted_median(values, weights):
    pass # Deprecated in favor of single best face

def get_focus(image_path):
    try:
        img_data = np.fromfile(image_path, dtype=np.uint8)
        img = cv2.imdecode(img_data, cv2.IMREAD_COLOR)
        
        if img is None:
            return None, None
            
        img_h, img_w = img.shape[:2]
        
        # Scale down to 640px width for reliable detection
        scale = 640.0 / img_w
        if scale < 1.0:
            small_w, small_h = int(img_w * scale), int(img_h * scale)
            detect_img = cv2.resize(img, (small_w, small_h))
        else:
            detect_img = img
            scale = 1.0
            
        gray = cv2.cvtColor(detect_img, cv2.COLOR_BGR2GRAY)
        
        # Detect faces
        frontal_faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(20, 20))
        profile_faces = profile_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(20, 20))
        
        all_faces = []
        for x, y, w, h in frontal_faces:
            all_faces.append((x, y, w, h, 2.0))
            
        def compute_iou(boxA, boxB):
            xA, yA = max(boxA[0], boxB[0]), max(boxA[1], boxB[1])
            xB, yB = min(boxA[0]+boxA[2], boxB[0]+boxB[2]), min(boxA[1]+boxA[3], boxB[1]+boxB[3])
            interArea = max(0, xB - xA) * max(0, yB - yA)
            boxAArea = boxA[2] * boxA[3]
            boxBArea = boxB[2] * boxB[3]
            return interArea / float(boxAArea + boxBArea - interArea) if (boxAArea + boxBArea - interArea) > 0 else 0
            
        for px, py, pw, ph in profile_faces:
            is_overlap = False
            for fx, fy, fw, fh in frontal_faces:
                if compute_iou((px, py, pw, ph), (fx, fy, fw, fh)) > 0.3:
                    is_overlap = True
                    break
            if not is_overlap:
                all_faces.append((px, py, pw, ph, 0.2)) # Harshly penalize profiles
            
        if len(all_faces) > 0:
            orig_gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if scale < 1.0 else gray
            
            native_path = image_path.replace(os.path.join('build', 'thumbnails'), os.path.join('build', 'processed'), 1)
            native_img = None
            if os.path.exists(native_path):
                native_data = np.fromfile(native_path, dtype=np.uint8)
                native_img = cv2.imdecode(native_data, cv2.IMREAD_GRAYSCALE)
                
            sharpness_source = native_img if native_img is not None else orig_gray
            h_src, w_src = sharpness_source.shape[:2]
            
            best_face = None
            max_weight = -1
            
            for (sx, sy, sw, sh, multiplier) in all_faces:
                x = sx / scale
                y = sy / scale
                w = sw / scale
                h = sh / scale
                
                cx = (x + w / 2.0) / img_w
                cy = (y + h / 2.0) / img_h
                
                src_x = int(cx * w_src - (w / img_w / 2.0 * w_src))
                src_y = int(cy * h_src - (h / img_h / 2.0 * h_src))
                src_w = int((w / img_w) * w_src)
                src_h = int((h / img_h) * h_src)
                
                face_roi = sharpness_source[max(0, src_y):min(h_src, src_y+src_h), max(0, src_x):min(w_src, src_x+src_w)]
                if face_roi.size == 0:
                    continue
                    
                sharpness = cv2.Laplacian(face_roi, cv2.CV_64F).var()
                
                # Area normalized to 0.0-1.0 size of the whole image
                normalized_area = (w * h) / (img_w * img_h)
                face_width_ratio = w / img_w

                # Reject faces that take up too much horizontal space (too large for a narrow slice)
                if face_width_ratio > 0.25:
                    continue
                    
                # Reject faces that are extremely small (likely distant background faces)
                if face_width_ratio < 0.05:
                    continue
                
                # Exponential scaling for larger faces (up to the cap) + frontal vs profile multiplier
                weight = sharpness * (normalized_area ** 0.5) * multiplier
                
                if weight > max_weight:
                    max_weight = weight
                    
                    # Vertical Framing Guardrails: 
                    # Shift the focus Y coordinate UP by half the face height.
                    # This gives the downstream 1:2 crop algorithm "headroom" so hair/helmets aren't chopped off.
                    adjusted_cy = max(0.0, cy - (h / img_h * 0.5))
                    best_face = (cx, adjusted_cy)
                
            if best_face is not None:
                # having too many faces should penalize the score
                # having sharper + larger faces should increase the score
                # having face forward versus side profile should increase the score
                total_faces = len(all_faces)
                image_score = float(max_weight) / (total_faces ** 1.5) if total_faces > 0 else 0.0
                return float(best_face[0]), float(best_face[1]), image_score
                
    except Exception as e:
        print(f"Error processing {image_path}: {e}")
        
    return None, None, 0.0

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
                                skipped_count += 1
                                continue
                            
                        if os.path.exists(local_thumb_path):
                            fx, fy, score = get_focus(local_thumb_path)
                            if fx is not None:
                                cache_data[thumb_web_path] = {"x": fx, "y": fy, "score": score}
                                photo['focusX'] = fx
                                photo['focusY'] = fy
                                photo['faceScore'] = score
                                found_count += 1
                            else:
                                cache_data[thumb_web_path] = {"score": score} # 0.0
                                photo['faceScore'] = score
                            processed_count += 1
                        else:
                            cache_data[thumb_web_path] = None
                            
                        if processed_count > 0 and processed_count % 100 == 0:
                            print(f"  Processed {processed_count} new images... ({found_count} faces tracked so far)")
                            
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
