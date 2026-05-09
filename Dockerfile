FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV DISPLAY=:0
ENV RESOLUTION=1024x768x24

# Install Java, X11, VNC, noVNC, fluxbox, and wget
RUN apt-get update && apt-get install -y \
    openjdk-17-jre \
    xvfb \
    x11vnc \
    fluxbox \
    novnc \
    websockify \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Download MARS Simulator
RUN wget -O Mars.jar "https://web.archive.org/web/20210211124430if_/http://courses.missouristate.edu/kenvollmar/mars/MARS_4_5_Aug2014/Mars4_5.jar"

# Copy the assembly code
COPY sudoku.asm ./sudoku.asm

# Create a startup script
RUN echo '#!/bin/bash\n\
export DISPLAY=:0\n\
# Start X virtual framebuffer\n\
Xvfb :0 -screen 0 ${RESOLUTION} &\n\
sleep 1\n\
\n\
# Start window manager\n\
fluxbox &\n\
\n\
# Start VNC server\n\
x11vnc -display :0 -nopw -listen localhost -xkb -forever &\n\
\n\
# Start noVNC\n\
websockify --web=/usr/share/novnc/ 6080 localhost:5900 &\n\
\n\
# Run MARS Simulator IDE\n\
java -jar Mars.jar\n\
' > start.sh && chmod +x start.sh

EXPOSE 6080

CMD ["./start.sh"]
