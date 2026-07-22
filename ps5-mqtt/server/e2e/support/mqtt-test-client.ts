import MQTT from "async-mqtt"

type MessageValue = Record<string, unknown> | string

export interface TestMqttClient {
  publish(topic: string, payload: string): Promise<void>
  /**
   * Resolve with the first message on `topic` matching `predicate`. Checks the
   * last retained value seen for the topic first (so retained messages
   * delivered at subscribe time aren't missed), then waits for new ones.
   */
  waitForMessage(
    topic: string,
    predicate?: (payload: MessageValue) => boolean,
    timeoutMs?: number,
  ): Promise<MessageValue>
  end(): Promise<void>
}

const parse = (payload: Buffer): MessageValue => {
  const text = payload.toString()
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return text
  }
}

export async function createTestMqttClient(
  url = "mqtt://localhost:1883",
): Promise<TestMqttClient> {
  const client = await MQTT.connectAsync(url)

  const lastByTopic = new Map<string, MessageValue>()
  const listeners = new Set<(topic: string, value: MessageValue) => void>()

  client.on("message", (topic, payload) => {
    const value = parse(payload)
    lastByTopic.set(topic, value)
    for (const listener of listeners) {
      listener(topic, value)
    }
  })

  // Subscribe to everything so retained state + discovery topics are captured.
  await client.subscribe("#")

  return {
    async publish(topic, payload) {
      await client.publish(topic, payload)
    },

    waitForMessage(topic, predicate = () => true, timeoutMs = 15000) {
      const buffered = lastByTopic.get(topic)
      if (buffered !== undefined && predicate(buffered)) {
        return Promise.resolve(buffered)
      }

      return new Promise<MessageValue>((resolve, reject) => {
        const timer = setTimeout(() => {
          listeners.delete(listener)
          reject(new Error(`Timed out waiting for a message on "${topic}"`))
        }, timeoutMs)

        const listener = (messageTopic: string, value: MessageValue) => {
          if (messageTopic !== topic || !predicate(value)) {
            return
          }
          clearTimeout(timer)
          listeners.delete(listener)
          resolve(value)
        }

        listeners.add(listener)
      })
    },

    async end() {
      await client.end()
    },
  }
}
