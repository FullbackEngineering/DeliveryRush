# Stream Methods

Real-time data streaming between the game and backend (sensor data, player actions, game events).

## StreamEmitter

`listenData()`, `connectGame()`, `readGyroscope()`, `readAccelerometer()` all resolve to a `StreamEmitter`:

```js
emitter.on(eventName, handler)   // subscribe, returns unsubscribe fn
emitter.off(eventName, handler)  // unsubscribe
emitter.stop(reason)             // stop the stream
emitter.id                        // stream ID
emitter.stream                    // stream name
```

| Event                      | Description                 |
| ----------------------------- | -------------------------------- |
| `data`                           | New data arrived                    |
| `stream.accepted`                | Stream accepted by server           |
| `stream.started`                  | Stream started                        |
| `stream.end`                        | Stream ended                            |
| `stream.error` / `error`              | Stream error                              |
| `end`                                    | Stream ended (short form)                   |

## Stream lifecycle

1. `listenData()` called → stream request sent.
2. `ready` ack arrives → promise resolves with a `StreamEmitter`.
3. `stream.accepted` — accepted by server.
4. `stream.started` — active, data begins flowing.
5. `data` — fires per incoming packet.
6. End conditions: `emitter.stop()` → `end`; closed by platform → `stream.end`; on error → `stream.error`/`error`.

## Disconnection & auto-reconnect

The platform auto-reconnects open game-stream sockets on app switch, screen off, backgrounding, or a temporary network drop. During reconnection, system events arrive over the `data` event, distinguished by `op_code`. **These are sent automatically — no action required, but listen for them to update UI/resync state.**

| `op_code` | Meaning                                          | Stream       |
| ---------- | ----------------------------------------------------- | -------------- |
| `97`          | `reconnecting` — connection dropped, retrying               | Game stream       |
| `98`           | `reconnected` — connection re-established                     | Game stream       |
| `99`            | `presence_changed` / `match_ready` — presence update            | Game stream       |
| `100`            | chat message                                                       | Room chat           |
| `101`             | chat presence                                                        | Room chat           |

```js
emitter.on('data', (payload) => {
  if (payload.op_code === 97) { showReconnectingIndicator(); return }
  if (payload.op_code === 98) { hideReconnectingIndicator(); refreshGameState(); return }
  handleGameData(payload)
})
```

If reconnection fails after several attempts, the stream ends with an `error` event, message `reconnect_failed`.

---

## sendData

```ts
gameTegra.sendData(params)
```
Sends data over a game stream — starts a stream, pushes the payload, and (with `autoStop`) closes it automatically.

```js
gameTegra.sendData({ stream: 'player-action', payload: { action: 'move', x: 10, y: 20 } })
```

| Param       | Type              | Required | Description                                                   |
| ------------ | ------------------- | -------- | ------------------------------------------------------------------ |
| `stream`         | string                 | Yes       | Target stream name; aliases: `channel`, `name`, `topic`                |
| `payload`          | object \| array          | Yes       |                                                                        |
| `key`                | string                     | No        | Cache key for the native controller; defaults to stream name              |
| `autoStop`             | boolean                     | No        | Auto-stop after send; default `true`                                        |

**Returns:** Promise resolving to a `StreamController` handle (`push`, `error`, `stop`, `on`).

## listenData

```ts
gameTegra.listenData(params?)
```

```js
const emitter = await gameTegra.listenData()
emitter.on('data', (payload) => { console.log(payload) })
```
```csharp
var emitter = await gameTegra.listenData(true);
emitter.OnData += (payload) => Debug.Log(payload);
```

## connectGame

```ts
gameTegra.connectGame(streamName, options?)
```
Connects to a named game stream, returns an Emitter.

```js
const emitter = await gameTegra.connectGame('game-events')
emitter.on('data', (e) => handleEvent(e))
```

| Param        | Type   | Required |
| ------------- | ------ | -------- |
| `streamName`     | string  | Yes       |
| `options`          | object  | No        |

## stopStream

```ts
gameTegra.stopStream(channelKey)
```
Stops an active **SEND-side** stream by its channel key. ⚠️ To stop a `listenData`/`connectGame` subscription, use `stopListeningStream()` or the emitter's `.stop()` instead — `stopStream()` only affects the send side.

```js
await gameTegra.stopStream('room-chat-lobby')
```

Returns `Promise<void>` — resolves when the stop request is dispatched (the Engine ack isn't surfaced to JS).

## readGyroscope

```ts
gameTegra.readGyroscope(options?)
```

```js
const gyro = await gameTegra.readGyroscope({ normalize: true })
gyro.on('data', (d) => { console.log(d.x, d.y, d.z) })
```

| Param       | Type    | Required | Description                                    |
| ------------ | ------- | -------- | ------------------------------------------------- |
| `normalize`      | boolean  | No        | `true` → degrees instead of radians                    |

Emits `{ x, y, z }`.

## readAccelerometer

```ts
gameTegra.readAccelerometer()
```

```js
const accel = await gameTegra.readAccelerometer()
accel.on('data', (d) => { console.log(d.x, d.y, d.z) })
```

Emits `{ x, y, z }` in g.

## stopListeningStream

```ts
gameTegra.stopListeningStream(keyOrEmitter)
```
Stops a **LISTEN-side** subscription from `listenData`, `connectGame`, `readGyroscope`, or `readAccelerometer`. JS/Web only.

```js
await gameTegra.stopListeningStream(emitter)
// or by key
await gameTegra.stopListeningStream('game-events')
```
