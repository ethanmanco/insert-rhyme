"""Pull the songs of the app's rap style artists out of a lyrics dataset.

Source: "Genius English Song Lyrics - Cleaned & Deduplicated" on Hugging Face
(theelderemo/genius-lyrics-cleaned, MIT, DOI 10.57967/hf/7978), revision
2a6c82329e467f3a7be78dee6ed2a90b29d78201: the ten data/train-*.parquet files.
The lyrics belong to their writers; they stay on the machine that runs this
and never go in the repository. Only stats.py's word counts and rhyme pairs do.

Usage (needs pyarrow):
  python -I extract.py <folder with the parquet files> <src/core/categories.ts> <work folder>
Writes <work>/songs.jsonl (artists, style ids, lyrics), <work>/baseline.json
(word counts over every 20th rap song in the data) and <work>/coverage.txt.
Songs credited to several artists ("Boosie Badazz & Webbie") count for each.
"""
import json, re, sys, collections
from pathlib import Path
import pyarrow.parquet as pq

src, cats, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
out.mkdir(parents=True, exist_ok=True)

def norm(name):
    return re.sub(r"[^a-z0-9]", "", name.lower().replace("$", "s").replace("&", "and"))

text = cats.read_text(encoding="utf-8")
styles = {}
for block in re.findall(r"\n  \{\n((?:.*\n)*?)  \},", text):
    if 'kind: "style"' not in block:
        continue
    sid = re.search(r'id: "(\w+)"', block).group(1)
    styles[sid] = re.findall(r'"([^"]+)"', re.search(r"artists: \[([^\]]*)\]", block).group(1))

ALIASES = {"Mos Def": ["Yasiin Bey"], "Kanye West": ["Ye"], "Jay-Z": ["JAY Z"], "The Notorious B.I.G.": ["Notorious B.I.G.", "The Notorious BIG"],
           "Bossman Dlow": ["BossMan Dlow"], "Trill Fam": ["Trill Family"], "8Ball & MJG": ["8Ball and MJG", "Eightball & MJG"],
           "Del the Funky Homosapien": ["Del the Funky Homosapien", "Del tha Funkee Homosapien"], "Hurricane Chris": ["Hurricane Chris"],
           "DJ Screw": ["DJ Screw"], "Too $hort": ["Too Short"], "Boosie Badazz": ["Lil Boosie", "Boosie"], "Juvenile": ["Juvenile"]}
want = {}  # normalized name -> (display artist, set of styles)
for sid, artists in styles.items():
    for a in artists:
        for name in [a, *ALIASES.get(a, [])]:
            key = norm(name)
            want.setdefault(key, [a, set()])[1].add(sid)

SPLIT = re.compile(r"\s*(?:&|,|\+| x | X | feat\.? | ft\.? | and | with )\s*")
TOKEN = re.compile(r"[a-z]+(?:'[a-z]+)?'?")
baseline = collections.Counter()
found = collections.Counter()
seen_names = collections.Counter()
n_rap = 0
with open(out / "songs.jsonl", "w", encoding="utf-8") as f:
    for path in sorted(src.glob("*.parquet")):
        table = pq.read_table(path, columns=["artist", "tag", "lyrics", "title"])
        for artist, tag, lyrics, title in zip(*(table.column(c).to_pylist() for c in ["artist", "tag", "lyrics", "title"])):
            if not lyrics:
                continue
            # Collaborations count for each listed artist ("Boosie Badazz & Webbie").
            parts = {artist or ""} | set(SPLIT.split(artist or ""))
            hits = {want[norm(p)][0]: want[norm(p)][1] for p in parts if norm(p) in want}
            if hits:
                for display in hits:
                    found[display] += 1
                f.write(json.dumps({"artists": sorted(hits), "styles": sorted(set().union(*hits.values())), "title": title, "lyrics": lyrics}) + "\n")
            if tag == "rap":
                n_rap += 1
                if n_rap % 20 == 0:
                    baseline.update(TOKEN.findall(lyrics.lower()))
        print(path.name, "done", sum(found.values()), "songs so far", flush=True)

(out / "baseline.json").write_text(json.dumps({"songs": n_rap // 20, "counts": dict(baseline.most_common(200000))}))
report = []
for sid, artists in styles.items():
    report.append(sid + ": " + ", ".join(f"{a} {found[a]}" for a in artists))
(out / "coverage.txt").write_text("\n".join(report) + f"\n\nrap songs in dataset: {n_rap}\n", encoding="utf-8")
print("\n".join(report))
print("rap songs:", n_rap)
