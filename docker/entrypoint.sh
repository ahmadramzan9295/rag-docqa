#!/bin/sh
# Start FastAPI backend in background, then Streamlit in foreground
uvicorn app.api.routes:app --host 0.0.0.0 --port 8000 --workers 2 &
API_PID=$!

streamlit run app/streamlit_app.py \
  --server.port 8501 \
  --server.address 0.0.0.0 \
  --server.headless true \
  --browser.gatherUsageStats false

# If Streamlit exits, kill the API too
kill $API_PID
