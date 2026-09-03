FROM emscripten/emsdk:latest

WORKDIR /app

RUN apt-get update && apt-get install -y make

CMD ["bash"]
