# Store design assets

Final images for the Chrome Web Store / AMO listing (24-bit PNG, no alpha — a store requirement):

| File | Size | Store field |
|------|------|-------------|
| `nogamble-screenshot-1280x800.png` | 1280×800 | Screenshots |
| `nogamble-small-tile-440x280.png` | 440×280 | Small promo tile (Lille kampagnebillede) |
| `nogamble-marquee-1400x560.png` | 1400×560 | Marquee promo (Kampagnebillede med markeringsramme) |

## Regenerating

The images are rendered from the HTML files in `src/` (edit text/layout there, assets are referenced relatively):

```powershell
# From design/src/ — repeat per file with the matching --window-size
& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" `
  --headless=new --disable-gpu --hide-scrollbars `
  --force-device-scale-factor=1 --window-size=1280,800 `
  --screenshot="out.png" "file:///$PWD/store-image.html"
```

Sizes: `store-image.html` → 1280×800 · `campaign-small.html` → 440×280 (render at
`--force-device-scale-factor=2 --window-size=440,280`, then downscale to 440×280)
· `campaign-marquee.html` → 1400×560.

After rendering, convert to 24-bit PNG (headless Chromium outputs 32-bit with alpha,
which the store rejects) — e.g. with System.Drawing: draw onto a
`Format24bppRgb` bitmap and save.
