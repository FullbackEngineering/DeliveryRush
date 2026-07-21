# Controls (Virtual Gamepad)

Ready-to-use touch joystick + action buttons. **JS/Web only — not available in Godot or Unity.**

## controls.show

```ts
gameTegra.controls.show(config?)
```
Renders the virtual gamepad overlay.

```js
gameTegra.controls.show({ opacity: 0.8, joystick: true })
```

| Param      | Type    | Required | Description               |
| ----------- | ------- | -------- | ----------------------------- |
| `theme`         | string   | No        | Visual theme                     |
| `opacity`         | number   | No        | 0–1                                 |
| `joystick`          | boolean   | No        | Whether to show the joystick          |
| `buttons`             | array      | No        | Button configurations                   |

## controls.hide

```ts
gameTegra.controls.hide()
```
Hides the overlay without destroying it (state preserved for a later `show()`).

## controls.on

```ts
gameTegra.controls.on(code, fn)
```
Listener for a specific control event.

```js
const unsub = gameTegra.controls.on('joystick', (e) => { movePlayer(e.x, e.y) })
```

| Param   | Type      | Required | Description                            |
| -------- | --------- | -------- | -------------------------------------------- |
| `code`      | string     | Yes       | e.g. `'joystick'`, `'buttonA'`, `'fire'`         |
| `fn`          | function   | Yes       | Receives `{ code, type: 'press'|'release'|'move', timestamp }` |

Returns an unsubscribe function.

## controls.onAny

```ts
gameTegra.controls.onAny(fn)
```
Listener for **all** control events at once.

```js
gameTegra.controls.onAny((code, event) => { console.log(code, event) })
```

## controls.destroy

```ts
gameTegra.controls.destroy()
```
Completely destroys the controls — DOM elements, CSS, and all listeners removed. Call on scene/game shutdown.

## Custom HTML elements

Registered automatically when the SDK loads:

```html
<!-- Analog joystick (default) -->
<gametegra-joystick></gametegra-joystick>

<!-- D-pad -->
<gametegra-joystick type="dpad"></gametegra-joystick>

<!-- Custom buttons -->
<gametegra-buttons buttons='[{"code":"fire","label":"Fire","icon":"crosshair"}]'></gametegra-buttons>
```

These share the same event bus — listen with `gameTegra.controls.on()`.

## Full example

```js
gameTegra.controls.show({
  joystick: { type: 'analog', deadZone: 0.2 },
  buttons: [
    { code: 'fire',   label: 'Fire',   icon: 'crosshair' },
    { code: 'jump',   label: 'Jump',   icon: 'arrow_up' },
    { code: 'shield', label: 'Shield', icon: 'shield' },
  ],
  theme: 'dark',
  opacity: 0.8,
})

gameTegra.controls.on('up',    () => player.moveUp())
gameTegra.controls.on('down',  () => player.moveDown())
gameTegra.controls.on('left',  () => player.moveLeft())
gameTegra.controls.on('right', () => player.moveRight())
gameTegra.controls.on('idle',  () => player.stop())

gameTegra.controls.on('fire', (e) => {
  if (e.type === 'press')   player.startFiring()
  if (e.type === 'release') player.stopFiring()
})

// on game end / scene teardown:
gameTegra.controls.destroy()
```

Note: since this is layout/UI-affecting overlay content, coordinate placement with the safe-area rules in `references/best-practices.md` so buttons/joystick don't sit under a notch or home-indicator bar.
