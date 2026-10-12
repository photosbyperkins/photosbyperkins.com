import os
import sys

# Make `import ml...` work when running `python -m pytest scripts/ml/tests` from the repo root.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
