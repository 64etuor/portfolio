// Scene-only display faces. The @font-face rules live in scene-fonts.css and point
// at the latin woff2 files already in public/fonts/lab. SceneHost imports this
// module, so the faces ride the scene chunk — landing and /resume do not.
import './scene-fonts.css'
