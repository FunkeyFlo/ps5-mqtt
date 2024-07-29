ARG BUILD_FROM
FROM $BUILD_FROM

ENV LANG C.UTF-8
ARG BUILD_VERSION

RUN apk add --no-cache --virtual .build-dependencies \
    make gcc g++ linux-headers udev git python3 && \
    apk add --no-cache nodejs npm

RUN npm i -g playactor
RUN mkdir -p ~/.config/playactor

RUN mkdir -p app

COPY ./ps5-mqtt ./app

RUN cd /app && \
    npm install

# set permissions for both docker standalone and HA add-on startup scripts
RUN chmod a+x /app/run.sh
RUN chmod a+x /app/run-standalone.sh

EXPOSE 8645

ENTRYPOINT ["/app/run.sh"]
