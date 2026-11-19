"""Turn extract.py's songs into each rap style's word and rhyme stats.

Usage: python -I stats.py <work folder> <app repo> <out folder>
Reads <work>/songs.jsonl and <work>/baseline.json, the app's word files
(public/data/words-*.txt) and src/core/categories.ts. For every style with at
least MIN_SONGS songs it writes <out>/<style>.json with only:
  words: [word, weight 1-1000]  the style's artists' most typical words: used
         far more than in rap overall, by at least two of its artists, and not
         mostly by one (their own name)
  pairs: [a, b, count]          words its artists rhymed at the ends of lines
         one or two apart, with the style's accent (a port of phonetics.ts)
and <out>/counts.json (songs per style, for src/core/lyricCounts.ts), plus
<work>/report.txt to read. No lyric lines are written anywhere.
Copy the style files to public/data/styles/ and the counts into lyricCounts.ts.
"""
import collections, json, math, re, statistics, sys
from pathlib import Path

work, repo, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
out.mkdir(parents=True, exist_ok=True)

# ---------- The app's dictionary and rhyme keys (a port of src/core/phonetics.ts) ----------
prons = {}
for tier in ["clean", "profane", "slur"]:
    for line in (repo / "public" / "data" / f"words-{tier}.txt").read_text(encoding="utf-8").splitlines():
        parts = line.split("\t")
        if len(parts) == 3:
            all_p = [p.split() for p in parts[2].split("|")]
            n = sum(1 for x in all_p[0] if x[-1].isdigit())
            prons[parts[0]] = [p for p in all_p if sum(1 for x in p if x[-1].isdigit()) == n]

is_vowel = lambda p: p[-1].isdigit()
bare = lambda p: p[:-1] if p[-1].isdigit() else p

def stress_index(ph):
    for mark in "12":
        for i in range(len(ph) - 1, -1, -1):
            if ph[i].endswith(mark):
                return i
    for i in range(len(ph) - 1, -1, -1):
        if is_vowel(ph[i]):
            return i
    return -1

def rap_phones(ph):
    i = stress_index(ph)
    if i < 0:
        return ph
    o = ["AH0" if k > i and p == "ER0" else p for k, p in enumerate(ph)]
    n = len(o)
    if n - 2 > i and o[n - 2] == "IH0" and o[n - 1] == "NG":
        o[n - 1] = "N"
    elif n - 3 > i and o[n - 3] == "IH0" and o[n - 2] == "NG" and o[n - 1] == "Z":
        o[n - 2] = "N"
    return o

UK_DROPS_R = {"AA": "AA", "AO": "AO", "UH": "AO"}

def accent_phones(ph, accent):
    if accent == "us":
        return ph
    o, k = [], 0
    while k < len(ph):
        p = ph[k]
        nxt = ph[k + 1] if k + 1 < len(ph) else None
        after = ph[k + 2] if k + 2 < len(ph) else None
        if accent == "uk" and is_vowel(p) and bare(p) in UK_DROPS_R and nxt == "R" and not (after and is_vowel(after)):
            o.append(UK_DROPS_R[bare(p)] + p[-1])
            k += 2
            continue
        if accent == "south" and bare(p) == "EH" and nxt in ("N", "M"):
            o.append("IH" + p[-1])
        else:
            o.append(p)
        k += 1
    return o

SCHWA = {"AH0", "IH0", "UH0"}

def slant_key(ph, accent):
    p = accent_phones(rap_phones(ph), accent)
    i = stress_index(p)
    if i < 0:
        return ""
    tail = p[i:]
    j = len(tail)
    while j > 0 and not is_vowel(tail[j - 1]):
        j -= 1
    vowels = ["AH" if k > 0 and v in SCHWA else bare(v) for k, v in enumerate(x for x in tail if is_vowel(x))]
    return " ".join(vowels + ["|"] + tail[j:])

# ---------- Styles ----------
text = (repo / "src" / "core" / "categories.ts").read_text(encoding="utf-8")
styles = {}
own = {}
for block in re.findall(r"\n  \{\n((?:.*\n)*?)  \},", text):
    if 'kind: "style"' in block:
        sid = re.search(r'id: "(\w+)"', block).group(1)
        acc = re.search(r'accent: "(\w+)"', block)
        styles[sid] = acc.group(1) if acc else "us"
        own[sid] = re.findall(r'"([^"]+)"', re.search(r"artists: \[([^\]]*)\]", block).group(1))

# ---------- Words in lyrics ----------
TOKEN = re.compile(r"[a-z]+(?:'[a-z]+)?'?")
SKIP = set("""yeah yea yah uh uhh huh ayy ay ayo ooh oh ohh woah whoa hey ha haha nah na la da mm hmm ugh eh ah aye
yuh woo wooh brr skrt skrrt grr ooo oooh hah ya snippet snippets lyrics lyric embed recorded unreleased""".split())
# Function words: common in every song, useless as prompts.
STOP = set("""the a an and or but if of in on at to for from by with as is are was were be been being am do does did done
have has had having i me my mine myself you your yours yourself he him his she her hers it its we us our ours they them their
this that these those what who whom which when where why how there here then than so not no yes all any some just like get
got gets getting go goes going gone gon gonna wanna will would could should can cant cannot don dont didnt doesnt wont aint
im ive id em cause bout til till up out off down over into about too very really still now ever even also more most much
many every each other another such own same only both either neither while because until unless though although after
before again once let lets make made say said tell told know knew think thought want need see saw come came put take took
give gave keep kept way thing things something nothing anything everything someone somebody nobody everybody yeah okay""".split())

def word_of(tok):
    """A lyric token as a dictionary word: runnin' -> running, 'cause -> None."""
    tok = tok.strip("'")
    if tok in prons:
        return tok
    if tok.endswith("in") and tok + "g" in prons:
        return tok + "g"
    return None

def lines_of(lyrics):
    for line in lyrics.splitlines():
        line = line.strip()
        if not line or line.startswith("["):
            continue
        # Ad-libs in brackets are not the bar's last word.
        line = re.sub(r"\([^)]*\)", " ", line).lower()
        toks = TOKEN.findall(line)
        if toks:
            yield toks

artist_counts = collections.defaultdict(collections.Counter)  # artist -> word -> count
artist_total = collections.Counter()
style_docs = collections.defaultdict(collections.Counter)  # style -> word -> songs
style_users = collections.defaultdict(lambda: collections.defaultdict(set))  # style -> word -> artists
style_songs = collections.Counter()
style_artists = collections.defaultdict(collections.Counter)
pairs = collections.defaultdict(collections.Counter)  # style -> (a, b) -> count
line_sylls = collections.defaultdict(list)

seen_titles = set()
with open(work / "songs.jsonl", encoding="utf-8") as f:
    for row in map(json.loads, f):
        key = (tuple(row["artists"]), (row["title"] or "").lower())
        if key in seen_titles:
            continue
        seen_titles.add(key)
        song_words = set()
        ends = []
        for toks in lines_of(row["lyrics"]):
            words = [word_of(t) for t in toks]
            for a in row["artists"]:
                for w in words:
                    if w:
                        artist_counts[a][w] += 1
                        artist_total[a] += 1
            song_words.update(w for w in words if w)
            last = next((w for w in reversed(words) if w and w not in SKIP), None)
            ends.append(last)
            if all(words) and len(words) <= 30:
                for s in row["styles"]:
                    line_sylls[s].append(sum(sum(1 for x in prons[w][0] if is_vowel(x)) for w in words))
        for s in row["styles"]:
            style_songs[s] += 1
            for a in row["artists"]:
                style_artists[s][a] += 1
            for w in song_words:
                style_docs[s][w] += 1
                for a in row["artists"]:
                    style_users[s][w].add(a)
            acc = styles[s]
            keys = [None if w is None else {slant_key(p, acc) for p in prons[w]} for w in ends]
            for i, w in enumerate(ends):
                if not w:
                    continue
                for j in (i + 1, i + 2):
                    if j < len(ends) and ends[j] and ends[j] != w and keys[i] & keys[j]:
                        if {" ".join(p) for p in prons[w]} & {" ".join(p) for p in prons[ends[j]]}:
                            continue  # same sound twice (know, no) is not a rhyme
                        pairs[s][tuple(sorted((w, ends[j])))] += 1

base = json.loads((work / "baseline.json").read_text())["counts"]
base_total = sum(base.values())

report = []
counts = {}
MIN_SONGS = 100  # with fewer songs (Jersey club), a style keeps its hand-picked words only
for s, acc in styles.items():
    # Only the style's own artists shape its words; ones with more songs count a bit more.
    artists = [a for a in own[s] if artist_total[a] > 0]
    if not artists:
        continue
    weight = {a: math.sqrt(min(style_artists[s][a], 300)) for a in artists}
    total_w = sum(weight.values())
    def rel(w):
        return sum(weight[a] * artist_counts[a][w] / artist_total[a] for a in artists) / total_w
    def one_artist(w):
        """True when one artist says most of it: usually their own name."""
        shares = [weight[a] * artist_counts[a][w] / artist_total[a] for a in artists]
        return len(artists) >= 3 and max(shares) > 0.6 * sum(shares)
    min_docs = max(4, style_songs[s] // 200)
    min_users = min(2, len(artists))
    scored = []
    for w, docs in style_docs[s].items():
        if docs < min_docs or len(style_users[s][w]) < min_users or w in SKIP or w in STOP or not (3 <= len(w) <= 8):
            continue
        if one_artist(w):
            continue
        r = rel(w)
        ratio = r / ((base.get(w, 0) + 1) / base_total)
        if ratio > 2:
            scored.append((math.sqrt(r) * math.log(ratio), w))
    scored.sort(reverse=True)
    top = scored[:300]
    hi = top[0][0] if top else 1
    words = [[w, max(1, round(1000 * sc / hi))] for sc, w in top]
    ok = lambda w: 3 <= len(w) <= 8 and w not in STOP and w not in SKIP
    good = [[a, b, n] for (a, b), n in pairs[s].most_common() if n >= 2 and ok(a) and ok(b)][:1500]
    syl = round(statistics.median(line_sylls[s])) if line_sylls[s] else None
    if style_songs[s] < MIN_SONGS:
        report.append(f"{s}: only {style_songs[s]} songs, left out")
        continue
    (out / f"{s}.json").write_text(json.dumps({"words": words, "pairs": good}, separators=(",", ":")), encoding="utf-8")
    counts[s] = {"songs": style_songs[s], "syllables": syl}
    report.append(f"{s} ({style_songs[s]} songs, {len(artists)} artists, ~{syl} syllables a line, {len(good)} pairs)\n  words: "
                  + " ".join(w for w, _ in words[:60]) + "\n  pairs: " + "  ".join(f"{a}/{b}" for a, b, _ in good[:40]))
(work / "report.txt").write_text("\n".join(report), encoding="utf-8")
(out / "counts.json").write_text(json.dumps(counts, indent=1), encoding="utf-8")
print("\n".join(report))
