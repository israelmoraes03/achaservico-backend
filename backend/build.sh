#!/usr/bin/env bash
# Build script for Render

# Install regular dependencies
pip install -r requirements.txt

# Install emergentintegrations from custom index
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
