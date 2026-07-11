# Standalone (non-Home-Assistant) image for ps5-mqtt.
#
# Unlike the Home Assistant add-on image (see add-ons/common/Dockerfile) this
# image is built on a plain, stripped-down Alpine base and does not bundle the
# Home Assistant specific tooling (bashio, python3, git, build toolchain, ...).
#
# The build context is the server workspace (ps5-mqtt/server). The ready-to-ship
# application tree is produced by `yarn package` into `.packaged/` and is copied
# in as-is.
FROM alpine:3.21

ENV LANG=C.UTF-8

RUN apk add --no-cache nodejs npm

RUN mkdir -p ~/.config/playactor

# Copy the packaged application tree (.packaged/... -> /app/ps5-mqtt/...).
COPY .packaged/ /app/ps5-mqtt/

RUN cd /app/ps5-mqtt/server && \
    npm install --omit=dev --omit=optional

# playactor is invoked as a CLI binary (via shell) by the redux sagas. It's
# already a dependency, so just put its local bin on PATH instead of
# installing it again globally.
ENV PATH="/app/ps5-mqtt/server/node_modules/.bin:${PATH}"

RUN chmod a+x /app/ps5-mqtt/run.sh

EXPOSE 8645

ENTRYPOINT ["/app/ps5-mqtt/run.sh"]
