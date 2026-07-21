# Dev Console

In-WebView debug console — especially useful on mobile where browser DevTools aren't available. **JS/Web only.**

## devConsole.show

```ts
gameTegra.devConsole.show(opts?)
```
Shows the overlay. Optionally intercepts native console output.

```js
gameTegra.devConsole.show({ interceptConsole: true })
```

| Param                  | Type      | Required | Description                                               |
| ------------------------ | --------- | -------- | ----------------------------------------------------------------- |
| `interceptConsole`            | boolean    | No        | Redirects `console.log/warn/error` output to the overlay too         |

## devConsole.log / warn / error / success

```ts
gameTegra.devConsole.log(msg)
gameTegra.devConsole.warn(msg)
gameTegra.devConsole.error(msg)
gameTegra.devConsole.success(msg)
```
Each takes a single `string` message and adds a level-tagged log entry.

## devConsole.hide

```ts
gameTegra.devConsole.hide()
```
Hides the panel; the toggle button stays visible to reopen it.

## devConsole.toggle

```ts
gameTegra.devConsole.toggle()
```
Hides if open, shows if hidden.

## devConsole.clear

```ts
gameTegra.devConsole.clear()
```
Clears all log entries.

## Panel features

- Filter pills: All / Error / Warn / Info
- Clear button removes all logs
- Minimize button hides the panel (toggle button stays)
- Timestamps: `hh:mm:ss.ms` per entry
- Messages > 200 chars collapse/expand on click
- Max 200 entries kept (FIFO)
- `z-index: 999999` — renders above other overlays (including `controls`)

## Full example

```js
gameTegra.devConsole.show()

gameTegra.devConsole.log('Starting game…')
gameTegra.devConsole.success('Assets loaded')

// console.log/error are captured automatically once interceptConsole is on
console.log('Appears in both the browser console and the Dev Console panel')
console.error('This error is captured too')

gameTegra.devConsole.clear()
gameTegra.devConsole.hide()
```

Recommended: only call `devConsole.show()` behind a debug flag / dev build check — don't ship it visible in production builds.
