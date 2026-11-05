#!/usr/bin/env python3
"""规则回归：rules.yaml 结构校验 + 首批正反例判定。

用法：
    python scripts/check_rules.py
    python scripts/check_rules.py --rules ../rules/rules.yaml --samples ../rules/samples

M0 只实现 8 条规则的可执行判定（R001/R003/R005/R023/V01/V03/V04/V08），
其余规则做结构校验；M1 补齐全部样本与判定器。
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
TOKENS = json.loads((ROOT / "content" / "tokens.json").read_text(encoding="utf-8"))

FONT_SIZES = {
    size
    for token in TOKENS["font"].values()
    for size in (token.get("phone"), token.get("pc"), token.get("watch"))
    if size
}
SPACE_VALUES = set(TOKENS["space"]["levels"].values()) | set(TOKENS["space"]["elements"].values())
RADIUS_VALUES = set(TOKENS["radius"]["hierarchy"]) | set(TOKENS["radius"]["levels"].values())
DEVICE_MARGINS = {v["left"] for v in TOKENS["space"]["screenMargin"].values()}

V1_DECORATORS = re.compile(r"@(State|Link|Prop|Watch|Provide|Consume|Observed|ObjectLink)\b")
V2_DECORATORS = re.compile(r"@(Local|Param|Once|Event|Provider|Consumer|Monitor|Computed)\b")


def _num(text: str):
    return int(text)


def detect_static(rule_id: str, code: str) -> str:
    if rule_id == "R001":
        v1_component = re.search(r"@Component(?!V2)\b", code) is not None
        v2_component = re.search(r"@ComponentV2\b", code) is not None
        mixed = (v1_component and V2_DECORATORS.search(code)) or (
            v2_component and V1_DECORATORS.search(code)
        )
        return "fail" if mixed or (v1_component and v2_component) else "pass"

    if rule_id == "R003":
        if re.search(r"#[0-9a-fA-F]{3,8}\b", code):
            return "fail"
        for match in re.finditer(r"fontSize\(\s*(\d+)\s*\)", code):
            if _num(match.group(1)) not in FONT_SIZES:
                return "fail"
        for match in re.finditer(r"(?:padding|margin)\(\{([^}]*)\}\)", code):
            for value in re.findall(r":\s*(\d+)", match.group(1)):
                if _num(value) not in SPACE_VALUES:
                    return "fail"
        for match in re.finditer(r"(?:padding|margin)\(\s*(\d+)\s*\)", code):
            if _num(match.group(1)) not in SPACE_VALUES:
                return "fail"
        for match in re.finditer(r"borderRadius\(\s*(\d+)\s*\)", code):
            if _num(match.group(1)) not in RADIUS_VALUES:
                return "fail"
        return "pass"

    if rule_id == "R005":
        return "fail" if re.search(r"(?<!Lazy)ForEach\s*\(", code) else "pass"

    if rule_id == "R023":
        for match in re.finditer(r"fontSize\(\s*(\d+)\s*\)", code):
            if _num(match.group(1)) not in FONT_SIZES:
                return "fail"
        return "pass"

    raise KeyError(f"no detector for {rule_id}")


def _contrast(fg: str, bg: str) -> float:
    def parse(hex_color: str):
        raw = hex_color.lstrip("#")
        if len(raw) == 8:  # AARRGGBB
            alpha = int(raw[0:2], 16) / 255
            rgb = [int(raw[i : i + 2], 16) for i in (2, 4, 6)]
        elif len(raw) == 6:
            alpha, rgb = 1.0, [int(raw[i : i + 2], 16) for i in (0, 2, 4)]
        else:  # RGB
            alpha, rgb = 1.0, [int(c * 2, 16) for c in raw]
        return alpha, rgb

    def luminance(rgb):
        def channel(c):
            c = c / 255
            return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

        r, g, b = (channel(c) for c in rgb)
        return 0.2126 * r + 0.7152 * g + 0.0722 * b

    fa, frgb = parse(fg)
    _, brgb = parse(bg)
    composed = [fa * f + (1 - fa) * b for f, b in zip(frgb, brgb)]
    l1, l2 = luminance(composed), luminance(brgb)
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)


def detect_layout(rule_id: str, case: dict) -> str:
    density = case.get("density", 3.0)

    if rule_id == "V01":
        node = case["nodes"][0]
        margin_vp = node["bbox"]["left"] / density
        return "pass" if any(abs(margin_vp - m) <= 1 for m in DEVICE_MARGINS) else "fail"

    if rule_id == "V03":
        nodes = sorted(case["nodes"], key=lambda n: n["bbox"]["top"])
        gaps = [
            (nodes[i + 1]["bbox"]["top"] - nodes[i]["bbox"]["bottom"]) / density
            for i in range(len(nodes) - 1)
        ]
        if not gaps:
            return "pass"
        uniform = all(abs(g - gaps[0]) <= 0.5 for g in gaps)
        in_token = all(any(abs(g - t) <= 0.5 for t in SPACE_VALUES) for g in gaps)
        return "pass" if uniform and in_token else "fail"

    if rule_id == "V04":
        radii = {node.get("borderRadius") for node in case["nodes"]}
        return "pass" if len(radii) == 1 else "fail"

    if rule_id == "V08":
        ratio = _contrast(case["foreground"], case["background"])
        return "pass" if ratio >= 3.0 else "fail"

    raise KeyError(f"no detector for {rule_id}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rules", default=str(ROOT.parent / "rules" / "rules.yaml"))
    parser.add_argument("--samples", default=str(ROOT.parent / "rules" / "samples"))
    args = parser.parse_args()

    rules_path = Path(args.rules)
    samples_dir = Path(args.samples)
    doc = yaml.safe_load(rules_path.read_text(encoding="utf-8"))
    rules = doc["rules"] if isinstance(doc, dict) else doc
    rule_ids = {r["id"] for r in rules}

    failures, checked = [], 0
    for name in ("static-samples.json", "layout-samples.json"):
        path = samples_dir / name
        if not path.exists():
            print(f"SKIP {name}（不存在）")
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        for case in data.get("cases", []):
            cid, rid, expect = case["id"], case["rule"], case["expect"]
            if rid not in rule_ids:
                failures.append(f"{cid}: 规则 {rid} 不存在")
                continue
            try:
                actual = (
                    detect_static(rid, case["code"])
                    if "code" in case
                    else detect_layout(rid, case)
                )
            except KeyError as exc:
                print(f"SKIP {cid}: {exc}")
                continue
            checked += 1
            ok = actual == expect
            print(f"{'PASS' if ok else 'FAIL'}  {cid:<10} {rid:<5} expect={expect:<4} actual={actual}")
            if not ok:
                failures.append(f"{cid}: expect={expect} actual={actual}")

    # 结构约束（§8.9）
    for rule in rules:
        rid = rule["id"]
        spec = rule.get("spec") or {}
        if rule.get("severity") == "error" and not spec.get("url"):
            failures.append(f"{rid}: error 级但 spec.url 为空")
        if rule.get("calibrated") is False and rule.get("severity") == "error":
            failures.append(f"{rid}: calibrated=false 却要阻断")

    print(f"\n共判定 {checked} 例，失败 {len(failures)}")
    if failures:
        for item in failures:
            print(f"  ✗ {item}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
