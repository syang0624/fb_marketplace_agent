# RunPod Marketplace Backend

CPU `scraper` (BrightData) + GPU `vision` (Qwen2.5-VL defect detection) for the FB
Marketplace iPhone demo.

## Setup
- `pip install -r requirements.txt`
- `flash login` (or `export RUNPOD_API_KEY=...`)
- `export BRIGHTDATA_API_TOKEN=...`  (omit for fixture-backed dev)
- `export BRIGHTDATA_DATASET_ID=...` (only if not the default)

## Dev / Deploy
- `flash dev` — run endpoints on remote workers with hot reload
- `flash deploy` — ship stable endpoints
- `python -m runpod.demo` — offline end-to-end demo

## HTTP contract (for the UI)
POST /scraper_ep/listing   {urls:[str]}            -> {listings:[Listing]}
POST /scraper_ep/search    {query,location,limit}  -> {snapshot_id} | {listings}
POST /scraper_ep/snapshot  {snapshot_id}           -> {status, listings}
POST /scraper_ep/comparables {title}               -> {comparables:[]}  (phase-2 stub)
POST /vision_ep/defects    {image_urls:[str]}      -> {reports:[ImageDefectReport]}

Listing: {url,title,id,price,currency,condition,description,seller,location,images[],raw}
ImageDefectReport: {image_url,defects[],condition_grade,negotiation_summary,error}
Defect: {type,component,severity,confidence,note}
