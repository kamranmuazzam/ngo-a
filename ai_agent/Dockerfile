FROM python:3-slim
WORKDIR /app

RUN apt-get update && apt-get install -y curl xz-utils && \
    curl -L "https://github.com/typst/typst/releases/latest/download/typst-x86_64-unknown-linux-musl.tar.xz" -o typst.tar.xz && \
    tar -xf typst.tar.xz && \
    mv typst-*/typst /usr/local/bin/ && \
    rm -rf typst* && \
    apt-get clean

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8001
CMD ["python", "agent.py"]
