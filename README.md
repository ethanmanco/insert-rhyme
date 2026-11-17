# Insert Rhyme

Free 8-bit freestyle rap practice. Pick a beat, watch the ball bounce across each bar, and land your rhymes on the bright blocks. No accounts, no ads, nothing to pay for.

**Try it:** https://ethanmanco.github.io/insert-rhyme/

Work in progress. Right now it has one beat (Dusty boom bap), the bar view with the bouncing ball, and the AABB rhyme scheme. Word prompts, the rhyme helper, more beats and schemes, tap tempo, recording and streaks are next.

## How it stays on the beat

The ball never runs on its own timer. Every frame, the app asks the audio clock where the music is (minus the delay before sound reaches your ears) and draws the ball at exactly that spot, so it cannot drift away from the beat, even in a long session.

## Credits

The drum and synth sounds come from [Steplab](https://github.com/ethanmanco/steplab), my browser beat maker. Every sound is made in code, with no audio samples.

Built with Claude Code. I designed, directed, reviewed, and tested it.
