# Development tools

`verify.py`, `check_interactions.mjs`, `start_preview.py` and `package_preview.py` support the current preview. Run them from the repository root. Some verification tools expect Node, FFprobe or FFmpeg on PATH.

Large media originals were split for transport. `restore_large_assets.py` verifies and restores their exact bytes and is also called by `serve.py` at startup. `pack_large_assets.py` is a one-time publishing step; do not run it on a normal clone.

Other scripts preserve the actual implementation history: asset preparation, partner insertion, font installation, reference inspection, layout refinement and subbrand migration. Many are **one-time transformations**, not repeatable build steps. Do not rerun `prepare_subbrand.py`, `align_home.py`, `align_footer.py` or `finish_reference_match.py` against the final source. Inspect their preconditions first.

Reference inspection scripts may expect a sibling `Jannat-Offline` research mirror. Asset preparation scripts may expect locally generated originals. Those machine-specific inputs are not required to run the completed site. All runtime assets are included under `assets/`.
