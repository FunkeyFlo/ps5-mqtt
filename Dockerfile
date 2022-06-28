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

COPY . ./app

RUN cd /app && \
    npm ci --no-audit --no-optional --no-update-notifier --unsafe-perm && \
    npm run build

ENTRYPOINT ["/run.sh"]
