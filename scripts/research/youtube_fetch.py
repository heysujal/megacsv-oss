"""Collects YouTube search results and top comments for large-CSV pain points.

Reads YOUTUBE_API_KEY from .env. Writes research-data/youtube.json (committed;
the repo is private and it holds commenters' names). Quota: ~100 units per search, ~1 per page of
comments or video stats; the free daily quota is 10,000.

    python3 scripts/research/youtube_fetch.py
"""

import json
import ssl
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "research-data" / "youtube.json"
API = "https://www.googleapis.com/youtube/v3/"

QUERIES = [
    "open large csv file",
    "csv file too big for excel",
    "excel more than 1 million rows",
    "open csv with more than 1 million rows",
    "how to open 10gb csv file",
    "excel file not loaded completely",
    "data set too large for the excel grid",
    "power query large csv file",
    "split large csv file into multiple files",
    "large csv viewer",
    "csv viewer",
    "excel not responding large file",
    "open large csv file on mac",
    "import large csv into excel",
    "excel 1048576 rows limit",
    "how to handle millions of rows in excel",
    "view large csv without excel",
    "pandas read large csv memory error",
    "google sheets csv too large to import",
    "split csv for salesforce import",
    "csv leading zeros excel",
    "csv opens in one column excel",
    "analyze large csv file without coding",
    "power pivot millions of rows csv",
    "duckdb large csv",
]
SEARCH_RESULTS = 15
COMMENT_VIDEOS_PER_QUERY = 4
COMMENT_PAGES = 2  # up to 200 top-level comments per video


def key() -> str:
    for line in (ROOT / ".env").read_text().splitlines():
        if line.startswith("YOUTUBE_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"')
    sys.exit("YOUTUBE_API_KEY missing from .env")


KEY = key()
units = 0

try:
    import certifi  # Python from python.org on macOS ships without CA certificates.

    SSL = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    SSL = ssl.create_default_context()


def call(endpoint: str, cost: int, **params) -> dict:
    global units
    params["key"] = KEY
    url = API + endpoint + "?" + urllib.parse.urlencode(params)
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, timeout=30, context=SSL) as r:
                units += cost
                return json.load(r)
        except urllib.error.HTTPError as e:
            body = e.read().decode(errors="replace")
            # Comments disabled on a video is normal; skip it.
            if e.code == 403 and "commentsDisabled" in body:
                return {"items": []}
            if e.code == 403 and "quota" in body.lower():
                sys.exit(f"quota exhausted after ~{units} units")
            if attempt == 2:
                print(f"  {endpoint} failed: {e.code} {body[:200]}", file=sys.stderr)
                return {"items": []}
        except urllib.error.URLError as e:
            if attempt == 2:
                print(f"  {endpoint} failed: {e}", file=sys.stderr)
                return {"items": []}
        time.sleep(1 + attempt)
    return {"items": []}


def main() -> None:
    data = {"queries": {}, "videos": {}, "comments": {}}
    for q in QUERIES:
        res = call("search", 100, part="snippet", q=q, type="video", maxResults=SEARCH_RESULTS, relevanceLanguage="en")
        ids = [it["id"]["videoId"] for it in res.get("items", [])]
        data["queries"][q] = ids
        print(f"search: {q!r} -> {len(ids)} videos", file=sys.stderr)

    all_ids = sorted({v for ids in data["queries"].values() for v in ids})
    for i in range(0, len(all_ids), 50):
        res = call("videos", 1, part="snippet,statistics", id=",".join(all_ids[i : i + 50]))
        for it in res.get("items", []):
            s, st = it["snippet"], it.get("statistics", {})
            data["videos"][it["id"]] = {
                "title": s["title"],
                "channel": s["channelTitle"],
                "published": s["publishedAt"][:10],
                "views": int(st.get("viewCount", 0)),
                "likes": int(st.get("likeCount", 0)),
                "comments": int(st.get("commentCount", 0)),
            }

    # Top videos by views for each query, deduplicated.
    picked = []
    for q, ids in data["queries"].items():
        ranked = sorted((v for v in ids if v in data["videos"]), key=lambda v: -data["videos"][v]["views"])
        for v in ranked[:COMMENT_VIDEOS_PER_QUERY]:
            if v not in picked and data["videos"][v]["comments"] > 0:
                picked.append(v)
    for n, vid in enumerate(picked, 1):
        comments, token = [], None
        for _ in range(COMMENT_PAGES):
            params = dict(part="snippet,replies", videoId=vid, maxResults=100, order="relevance", textFormat="plainText")
            if token:
                params["pageToken"] = token
            res = call("commentThreads", 1, **params)
            for it in res.get("items", []):
                top = it["snippet"]["topLevelComment"]["snippet"]
                replies = [r["snippet"]["textOriginal"] for r in it.get("replies", {}).get("comments", [])]
                comments.append({
                    "author": top.get("authorDisplayName", ""),
                    "text": top["textOriginal"],
                    "likes": top.get("likeCount", 0),
                    "date": top["publishedAt"][:10],
                    "replies": replies,
                })
            token = res.get("nextPageToken")
            if not token:
                break
        data["comments"][vid] = comments
        print(f"comments {n}/{len(picked)}: {len(comments)} on {data['videos'][vid]['title'][:60]!r}", file=sys.stderr)

    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(data, indent=1, ensure_ascii=False))
    total = sum(len(c) for c in data["comments"].values())
    print(f"done: {len(data['videos'])} videos, {total} comment threads, ~{units} quota units -> {OUT}", file=sys.stderr)


if __name__ == "__main__":
    main()
