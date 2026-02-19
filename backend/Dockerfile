FROM python:3.13-alpine

WORKDIR /app

RUN apk add --no-cache postgresql-dev gcc python3-dev musl-dev

COPY /backend/requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/

CMD ["python","backend/main.py"]
