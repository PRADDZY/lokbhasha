#!/usr/bin/env python3
"""
Download Marathi dictionary files from source
Run this after cloning the repository: python scripts/download_dicts.py
"""

import os
import json
from pathlib import Path

# Dictionary file mappings
# Note: You'll need to provide the actual URLs or local paths
DICT_FILES = {
    'lingo_dev_mr_en.json': 'https://example.com/dicts/lingo_dev_mr_en.json',
    'lingo_dev_mr_en.min.json': 'https://example.com/dicts/lingo_dev_mr_en.min.json',
    'shabdakosh_conversational.jsonl': 'https://example.com/dicts/shabdakosh_conversational.jsonl',
    'shabdakosh_instruction.jsonl': 'https://example.com/dicts/shabdakosh_instruction.jsonl',
    'shabdakosh_llm_ready.jsonl': 'https://example.com/dicts/shabdakosh_llm_ready.jsonl',
    'shabdakosh_plain_text.txt': 'https://example.com/dicts/shabdakosh_plain_text.txt',
}

def download_dicts():
    """Download dictionary files"""
    dict_dir = Path(__file__).parent.parent / 'dict'
    dict_dir.mkdir(exist_ok=True)
    
    print(f"Dictionary files should be placed in: {dict_dir}")
    print("\nYou can:")
    print("1. Download from your source and place in dict/ folder")
    print("2. Copy from an existing installation")
    print("3. Update DICT_FILES URLs in this script for automated download")
    
    # List what's expected
    print("\nExpected files:")
    for filename in DICT_FILES.keys():
        filepath = dict_dir / filename
        status = "✓ Found" if filepath.exists() else "✗ Missing"
        print(f"  {status}: {filename}")

if __name__ == '__main__':
    download_dicts()
