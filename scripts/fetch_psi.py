#!/usr/bin/env python3
"""Download NASA PSI combustion data for the Flame in Freefall challenge.

Usage:  python3 scripts/fetch_psi.py
Needs:  Python 3.8+ only (no extra packages). No NASA login needed.

Writes:
  data/investigations.json   one clean record per investigation (24 of them)
  data/raw/PSI-xx.json       the full PSI record for each investigation
  data/tables/*.csv          each investigation's "Experimental table" (one row per test)
"""
import json
import os
import subprocess
import urllib.error
import urllib.parse
import urllib.request

BASE = "https://psi.nasa.gov/geode-py/ws"
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")


def get(url, as_json=True):
    try:
        with urllib.request.urlopen(url, timeout=60) as r:
            body = r.read()
    except urllib.error.URLError as e:
        # python.org builds on macOS often ship without SSL certificates; curl uses the system's.
        if "CERTIFICATE_VERIFY_FAILED" not in str(e):
            raise
        body = subprocess.run(["curl", "-sfL", url], check=True, capture_output=True).stdout
    return json.loads(body) if as_json else body


def main():
    os.makedirs(os.path.join(ROOT, "raw"), exist_ok=True)
    os.makedirs(os.path.join(ROOT, "tables"), exist_ok=True)

    # 1. List every combustion investigation.
    q = urllib.parse.urlencode({"ffield": "Research Area", "fvalue": "Combustion Science", "size": 200})
    hits = get(f"{BASE}/repo/search?{q}")["hits"]["hits"]
    print(f"{len(hits)} combustion investigations")

    out = []
    for h in sorted(hits, key=lambda x: int(x["_source"]["Accession"].split("-")[1])):
        s = h["_source"]
        acc = s["Accession"]

        # 2. Full record: files, experimental table, publications.
        d = get(f"{BASE}/repo/investigations/{acc}")
        with open(os.path.join(ROOT, "raw", f"{acc}.json"), "w") as f:
            json.dump(d, f, indent=1, default=str)

        # 3. Download the experimental table(s). The API hands back a signed S3 link.
        tables = []
        for t in d.get("experimentalTable", []):
            name = t["file_name"]
            q = urllib.parse.urlencode({"file": name, "redirect": "false"})
            signed = get(f"{BASE}/studies/{acc}/download?{q}", as_json=False).decode().strip()
            with open(os.path.join(ROOT, "tables", name), "wb") as f:
                f.write(get(signed, as_json=False))
            tables.append(name)

        out.append({
            "accession": acc,
            "acronym": s.get("Acronym", ""),
            "title": s.get("Title", ""),
            "projectType": s.get("Project Type", ""),
            "flightPlatform": s.get("Flight Platform", ""),
            "hardware": hw.get("Name", "") if isinstance(hw := s.get("Experiment Hardware", ""), dict) else hw,
            "subArea": s.get("SubResearch Area", ""),
            "keywords": [k.strip() for k in s.get("Keywords", "").split("  ") if k.strip()],
            "objectives": s.get("Objectives", ""),
            "approach": s.get("Approach", ""),
            "hypothesis": s.get("Hypothesis", ""),
            "earthBenefits": s.get("Research Impacts/Earth Benefits", ""),
            "relatedInvestigations": s.get("Related Investigations", "").split(),
            "startDate": s.get("Investigation Start Date", ""),
            "endDate": s.get("Investigation End Date", ""),
            "doi": d.get("doi", ""),
            "psiPage": f"https://psi.nasa.gov/physci/repo/data/investigations/{acc}",
            "totalDataGB": round((d.get("totalFileSize") or 0) / 1e9, 1),
            "experimentalTables": tables,
            "publications": [
                {"title": p.get("title", ""), "authors": p.get("authorList", ""), "doi": p.get("doi", "")}
                for p in d.get("publications", [])
            ],
        })
        print(f"  {acc:8} {s.get('Acronym') or '(ground study)':22} tables={len(tables)}")

    with open(os.path.join(ROOT, "investigations.json"), "w") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
    print("Done -> data/")


if __name__ == "__main__":
    main()
