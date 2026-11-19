"""Second YouTube pass (Nov 1, 2026): blog-topic gaps. Reuses youtube_fetch with new
queries and writes research-data/youtube-blog.json. Findings: docs/research/blog-topics.md.

    SSL_CERT_FILE=/etc/ssl/cert.pem python3 scripts/research/youtube_fetch_blog.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import youtube_fetch as yf

yf.OUT = yf.ROOT / "research-data" / "youtube-blog.json"
yf.COMMENT_VIDEOS_PER_QUERY = 3
yf.COMMENT_PAGES = 1
yf.QUERIES = [
    # Excel mangling values (MegaCSV shows raw values, keeps IDs as text in XLSX)
    "excel removes leading zeros csv",
    "excel scientific notation csv long numbers",
    "excel changes dates when opening csv",
    "csv utf-8 excel weird characters",
    # Row limit wording
    "excel more than 10 lakh rows",
    "how to increase excel row limit",
    "convert large csv to excel multiple sheets",
    "csv to xlsx more than 1 million rows",
    # Split for import into other systems
    "split csv file for import",
    "hubspot import file too large",
    "shopify product csv import error large file",
    "mailchimp import csv contacts limit",
    "salesforce data import wizard 50000 records",
    # Named exports that get too big
    "stripe export csv excel",
    "shopify export orders csv excel",
    "screaming frog large crawl excel",
    "google analytics export too many rows",
    "quickbooks general ledger export excel too large",
    "sap export to excel too many rows",
    "tally export to excel",
    "bank statement csv excel",
    "kaggle dataset too big for excel",
    # Other tools refusing
    "notepad++ file too big to open",
    "google sheets 10 million cells limit",
    "libreoffice calc maximum rows",
    "excel not enough memory to complete this action",
    # Tasks
    "filter large csv file without excel",
    "search large csv file",
    "open csv file without excel",
    "log file too large to open",
]

if __name__ == "__main__":
    yf.main()
