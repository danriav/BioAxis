# Usamos una imagen ligera de Python
FROM python:3.13-slim

# Evita que Python genere archivos .pyc y permite ver logs en tiempo real
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

# Instalamos dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiamos el código
COPY . .

# Exponemos el puerto de FastAPI
EXPOSE 8000

# Comando para arrancar
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]