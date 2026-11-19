# Mania / Custom

A small browser rhythm game inspired by osu!mania. Import an `.osz` archive, choose a compatible 4-key (`Mode: 3`, `CircleSize: 4`) difficulty, and play with **D F J K**. Charts and audio stay in your browser.

## Start and play

1. Open a terminal in the project folder.
2. Start a local web server:
   - Python: `python -m http.server 8000`
   - Or VS Code: use the Live Server extension.
3. Open `http://localhost:8000` in your browser.
4. Choose an `.osz` file, then press **PLAY** next to a 4K difficulty.
5. Press **Start song**. Tap **D**, **F**, **J**, or **K** when a note reaches the line. Hold the matching key through a long note; releasing early counts as a miss.
6. Reach **70% accuracy** to clear the chart. Use **Restart** or **Play again** to try again.

The project loads JSZip from a CDN, so an internet connection is needed on first load. You need a compatible 4K `.osz` chart to play; use a chart and audio you have permission to use. The beatmap archive and its audio are processed locally in your browser; they are not sent to a server.

## Current prototype features

- Imports `.osz` ZIP archives containing `.osu` beatmaps and audio.
- Lists every compatible 4K osu!mania difficulty found in the archive.
- Reads title, artist, mapper, difficulty name, audio filename, and hit objects.
- Plays tap notes and displays hold-note bodies.
- D/F/J/K controls, Perfect/Great/Miss judgments, score, accuracy, and combo.
- Hold notes must be held through their tails. Releasing early breaks combo and counts as a miss.
- A finished round clears at 70% accuracy and shows the score, accuracy, max combo, and retry/library buttons.
- Uses original CSS shapes and interface styling.

## Current limitations

- This first playable build supports **4K osu!mania only**. Other key counts and other osu! modes are skipped with a clear message.
- It uses a simple fixed timing window and note approach speed. Advanced timing-point changes, custom offsets, scroll-speed settings, skin support, storyboard/video elements, and full osu! scoring are not implemented yet.
- Some archives use unusual audio paths or formats that a browser may not decode. MP3 and OGG are the safest choices.
- This is an original learning project inspired by the rhythm-game format, not an official osu! client.

## Files

- `index.html` — page structure and the default web-server entry point
- `style.css` — visual design
- `game.js` — archive import, beatmap parser, and game loop

Do not upload copyrighted beatmap/audio files to the repository unless you have permission.
