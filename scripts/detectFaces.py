"""Subject detection (faces / people / saliency focus points) — compatibility entry point.

The implementation lives in scripts/ml/ (stage: scripts/ml/stages/subjects.py). Results are
cached in data/ml_cache.sqlite by source-photo content hash + stage fingerprint, applied to
data/photos.json, and exported to data/.faces_cache.json for scripts/pipeline/generatePhotoIndex.ts.

Usage: python scripts/detectFaces.py [--force] [--limit N] [--dry-run] [--cpu] [--workers N]
                                     [--sample N] [--gc] [--stats]
(equivalent to: python scripts/ml/run.py --stages subjects ...)
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ml.run import main  # noqa: E402

if __name__ == '__main__':
    sys.exit(main(['--stages', 'subjects', *sys.argv[1:]]))
