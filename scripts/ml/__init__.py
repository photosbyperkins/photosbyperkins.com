"""Incremental ML pipeline for photo analysis.

Results are stored in a content-addressed cache (data/ml_cache.sqlite) keyed by
(sha256 of the source JPEG, stage name, stage fingerprint). A stage fingerprint is derived
automatically from its version, tuning params, model file hashes and input recipe, so
reprocessing only touches photos whose bytes changed or stages whose code/config changed.

Entry point: python scripts/ml/run.py (scripts/detectFaces.py is a compatibility wrapper).
"""
