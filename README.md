# osu!mania Custom Charts (4K prototype)

A small browser rhythm game inspired by osu!mania. Import an `.osz` archive, choose a compatible 4-key (`Mode: 3`, `CircleSize: 4`) difficulty, and play with **D F J K**.

## Run it

1. Extract this project folder.
2. Open a terminal in the folder.
3. Start a local web server:
   - Python: `python -m http.server 8000`
   - Or VS Code: use the Live Server extension.
4. Open `http://localhost:8000` in your browser.
5. Import an `.osz` file and press **PLAY** next to a 4K difficulty.

The project loads JSZip from a CDN, so an internet connection is needed on first load. The beatmap archive and its audio are processed locally in your browser; they are not sent to a server.

## Current prototype features

- Imports `.osz` ZIP archives containing `.osu` beatmaps and audio.
- Lists every compatible 4K osu!mania difficulty found in the archive.
- Reads title, artist, mapper, difficulty name, audio filename, and hit objects.
- Plays tap notes and displays hold-note bodies.
- D/F/J/K controls, Perfect/Great/Miss judgments, score, accuracy, and combo.
- Uses original CSS shapes and interface styling.

## Current limitations

- This first playable build supports **4K osu!mania only**. Other key counts and other osu! modes are skipped with a clear message.
- Hold notes are currently judged on their head press; full hold/release tracking is a next step.
- It uses a simple fixed timing window and note approach speed. Advanced timing-point changes, custom offsets, scroll-speed settings, skin support, storyboard/video elements, and full osu! scoring are not implemented yet.
- Some archives use unusual audio paths or formats that a browser may not decode. MP3 and OGG are the safest choices.
- This is an original learning project inspired by the rhythm-game format, not an official osu! client.

## Files

- `index.html` — page structure
- `style.css` — visual design
- `game.js` — archive import, beatmap parser, and game loop

## GitHub

Create one repository named `osu-mania-custom`, add these files, commit, and push. Do not upload copyrighted beatmap/audio files to your repository unless you have permission; test with maps you are allowed to use.
