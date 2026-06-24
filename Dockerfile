# Build stage — compile the React frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Runtime stage — FastAPI backend serving the built frontend
FROM python:3.12-slim
WORKDIR /app
COPY backend/ backend/
COPY --from=frontend-builder /app/frontend/dist frontend/dist/
RUN pip install --no-cache-dir -r backend/requirements.txt
EXPOSE 10000
ENV PORT=10000
CMD ["python3", "backend/main.py"]
