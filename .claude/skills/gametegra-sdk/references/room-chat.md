# Room Chat

Real-time room-based chat — join rooms, send messages, listen to events. This is the **scriptable** in-game chat; for the native chat UI overlay, use `gameTegra.openMatchChat()` instead (see `references/game-methods.md`).

## RoomChatHandle

`roomChat.join()` returns a `RoomChatHandle`. `send`, `getHistory`, `on`, `off`, `leave` are all called **on that handle**, not on `gameTegra` directly.

| Property     | Type    | Description         |
| ------------- | ------- | ---------------------- |
| `roomName`       | string   | Resolved room name         |
| `channelId`         | string   | Channel ID                    |
| `streamKey`           | string   | Stream key                      |

## roomChat.join

```ts
roomChat.join(roomName?, options?)
```
Joins/creates a named room chat channel.

```js
const chat = await gameTegra.roomChat.join('lobby', { persistence: true, hidden: false })
chat.on('message', (msg) => console.log(msg))
chat.send('Hello!')
```
```csharp
var chat = await gameTegra.joinRoomChat("lobby", true, false);
chat.OnMessage += (msg) => Debug.Log(msg);
```

| Param           | Type    | Required | Description                                            |
| ---------------- | ------- | -------- | ----------------------------------------------------------- |
| `roomName`           | string   | No        | Defaults to the current match room                             |
| `persistence`          | boolean   | No        | Persist messages server-side                                     |
| `hidden`                 | boolean   | No        | Hide the joining user from presence events                          |

Returns: `{ roomName, channelId, streamKey }`.

## chat.send

```ts
chat.send(content)
```

```js
await chat.send("Hello!")
// or an object
await chat.send({ type: "game_action", action: "attack", target: "player2" })
```

`content: string | object`. Returns `{ success }`.

## chat.getHistory

```ts
chat.getHistory(limit?, cursor?, forward?)
```

```js
const history = await chat.getHistory(20)
const page2 = await chat.getHistory(20, "cursor-token", true)
```

| Param    | Type    | Required | Description                                     |
| --------- | ------- | -------- | -------------------------------------------------- |
| `limit`      | number   | No        | Default `50`                                          |
| `cursor`       | string   | No        | Pagination cursor from a previous response               |
| `forward`        | boolean   | No        | Forward if `true`, backward if `false`. Default `false`      |

Returns: `{ messages: [{ sender, content, createTime }], nextCursor, prevCursor }`.

## chat.on / chat.off

```ts
chat.on(event, handler)   // returns an unsubscribe function
chat.off(event, handler)  // JS/Web only
```

Supported events: `message`, `presence`, `error`, `end`.

```js
const unsub = chat.on("message", (msg) => console.log(msg.sender, msg.content))
unsub()
```

`message` event payload: `{ sender, content, createTime }`.
`presence` event payload: `{ joins: [{ userId }], leaves: [{ userId }] }`.

`chat.off(event, handler)` requires the **exact handler reference** passed to `chat.on()`.

## chat.leave

```ts
chat.leave()
```
Leaves the room and cleans up all listeners on the handle.

```js
await chat.leave()
```
Returns `{ success }`.

## Full example

```js
const chat = await gameTegra.roomChat.join('game-lobby')

chat.on('message', (msg) => {
  console.log(`[${msg.sender}]: ${msg.content}`)
})
chat.on('presence', (event) => {
  console.log('Player joined/left:', event)
})

const history = await chat.getHistory(20)
await chat.send({ text: 'Let the game begin!' })
await chat.leave()
```

### Match chat (automatic — no roomName)

```js
const chat = await gameTegra.roomChat.join()  // active match detected automatically
chat.on('message', (msg) => console.log(`[${msg.sender}]: ${msg.content}`))
await chat.send({ text: 'GG!' })

// ...or open the native chat UI instead of building your own:
await gameTegra.openMatchChat()
```
