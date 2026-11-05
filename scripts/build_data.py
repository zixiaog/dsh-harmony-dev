#!/usr/bin/env python3
"""构建插件数据：content/* + rules/rules.yaml -> data/*.json + manifest。

用法：
    python scripts/build_data.py                # 默认读 ../rules/rules.yaml
    python scripts/build_data.py --rules ../rules/rules.yaml

注意：DSH 沙箱里 shell 无写权限（只能读+执行），本脚本用于 CI / 本地终端；
沙箱内预览数据用 write 工具落盘（data/cards.json / data/rules.json 为预览快照）。

产出（data/）：
    tokens.json  设计 token（唯一真源快照）
    cards.json   组件卡
    rules.json   规则注册表
    manifest.json 条目数、校验和、构建时间
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent          # harmony-dev-kit/
DATA = ROOT / "data"

REQUIRED_CARD = ["id", "domain", "title", "summary", "since", "baseline", "state_mgmt", "sections"]
REQUIRED_RULE = ["id", "name", "layer", "severity", "detect", "fix"]


def load_json(path: Path):
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def load_yaml(path: Path):
    with path.open(encoding="utf-8") as f:
        return yaml.safe_load(f)


def sha(obj) -> str:
    blob = json.dumps(obj, ensure_ascii=False, sort_keys=True, default=str).encode("utf-8")
    return hashlib.sha256(blob).hexdigest()[:16]


def check_cards(cards: list[dict]) -> list[str]:
    errors, seen = [], set()
    for card in cards:
        cid = card.get("id", "?")
        for key in REQUIRED_CARD:
            if key not in card or card[key] in (None, ""):
                errors.append(f"card {cid}: 缺少字段 {key}")
        if cid in seen:
            errors.append(f"card {cid}: id 重复")
        seen.add(cid)
        sections = card.get("sections") or {}
        for key in ("usage", "example", "pitfalls"):
            if not sections.get(key):
                errors.append(f"card {cid}: sections.{key} 缺失")
        if card.get("state_mgmt") not in ("V1", "V2", "mixed", "—"):
            errors.append(f"card {cid}: state_mgmt 必须为 V1/V2/mixed（设计条目可为 —）")
        topics = card.get("topics")
        if topics is not None:
            if not isinstance(topics, list):
                errors.append(f"card {cid}: topics 必须是数组")
            else:
                topic_ids = set()
                for topic in topics:
                    if not isinstance(topic, dict):
                        errors.append(f"card {cid}: topic 必须是对象")
                        continue
                    for key in ("id", "title", "content"):
                        if not topic.get(key):
                            errors.append(f"card {cid}: topic 缺少字段 {key}")
                    tid = topic.get("id")
                    if tid in topic_ids:
                        errors.append(f"card {cid}: topic id 重复 {tid}")
                    topic_ids.add(tid)
    return errors


def expand_compact_card(card: dict) -> dict:
    """紧凑条目（只有 sig/ex/pit）展开为完整卡片；已有 sections 的原样返回。"""
    if card.get("sections"):
        return card

    data = dict(card)
    sig = data.pop("sig", None)
    example = data.pop("ex", None)
    pitfalls = data.pop("pit", None) or []
    perm = data.pop("perm", None)

    data.setdefault("domain", "api")
    data.setdefault("baseline", "6.1.1(24)")
    data.setdefault("state_mgmt", "—")
    data.setdefault("deprecated", False)
    data.setdefault("tokens", [])
    data.setdefault("sources", [])
    data.setdefault("since", "API 9")
    data.setdefault("updated", "2026-11-04")
    data["sections"] = {
        "usage": sig or data.get("summary", ""),
        "example": example or "// 示例待补",
        "pitfalls": pitfalls or ["用法待补"],
        "a11y": [],
        "adapt": [],
        "perf": [],
    }
    note = data.pop("version_note", "") or ""
    data["version_note"] = (f"权限：{perm}；" if perm else "") + (note or "API 参考页待补")
    return data


def synthesize_topics(card: dict) -> list[dict]:
    """从已核实的结构化字段整理主题（不新增事实），让每张卡都能下钻。"""
    cid = card.get("id", "card")
    sections = card.get("sections") or {}
    topics: list[dict] = []

    usage = (sections.get("usage") or "").strip()
    if usage:
        topics.append(
            {
                "id": f"{cid}.usage",
                "title": "适用场景与用法",
                "content": usage,
                "code": "",
                "source": "",
            }
        )

    props = card.get("props") or []
    if props:
        lines = []
        for prop in props:
            default = prop.get("default")
            if isinstance(default, bool):
                default = "true" if default else "false"
            elif default is None or default == "":
                default = "—"
            lines.append(
                f"- {prop.get('name', '?')}（{prop.get('type', '—')}，默认 {default}）：{prop.get('desc', '')}"
            )
        topics.append(
            {
                "id": f"{cid}.props",
                "title": "属性速查",
                "content": "\n".join(lines),
                "code": "",
                "source": "",
            }
        )

    events = card.get("events") or []
    if events:
        lines = [f"- {event.get('name', '?')}({event.get('params', '')})：{event.get('desc', '')}" for event in events]
        topics.append(
            {
                "id": f"{cid}.events",
                "title": "事件速查",
                "content": "\n".join(lines),
                "code": "",
                "source": "",
            }
        )

    pitfalls = sections.get("pitfalls") or []
    if pitfalls:
        topics.append(
            {
                "id": f"{cid}.pitfalls",
                "title": "常见坑",
                "content": "\n".join(f"- {item}" for item in pitfalls),
                "code": "",
                "source": "",
            }
        )

    quality = []
    for key, label in (("a11y", "无障碍"), ("adapt", "多端适配"), ("perf", "性能")):
        values = sections.get(key) or card.get(key) or []
        if values:
            quality.append(f"{label}：" + "；".join(str(item) for item in values))
    if quality:
        topics.append(
            {
                "id": f"{cid}.quality",
                "title": "无障碍 / 适配 / 性能",
                "content": "\n".join(quality),
                "code": "",
                "source": "",
            }
        )

    note = (card.get("version_note") or "").strip()
    if note:
        topics.append(
            {
                "id": f"{cid}.version",
                "title": "版本与权限说明",
                "content": note,
                "code": "",
                "source": "",
            }
        )

    return topics


def check_rules(rules: list[dict]) -> list[str]:
    errors, seen = [], set()
    for rule in rules:
        rid = rule.get("id", "?")
        for key in REQUIRED_RULE:
            if key not in rule or rule[key] in (None, ""):
                errors.append(f"rule {rid}: 缺少字段 {key}")
        if rid in seen:
            errors.append(f"rule {rid}: id 重复")
        seen.add(rid)
        spec = rule.get("spec") or {}
        if rule.get("severity") == "error" and not spec.get("url"):
            errors.append(f"rule {rid}: spec.url 为空时不得为 error（见 §8.9 约束 1）")
        if rule.get("calibrated") is False and rule.get("severity") == "error":
            errors.append(f"rule {rid}: calibrated=false 时不得阻断（约束 2）")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rules", default=str(ROOT.parent / "rules" / "rules.yaml"))
    args = parser.parse_args()

    tokens = load_json(ROOT / "content" / "tokens.json")
    versions = load_json(ROOT / "content" / "versions.json")
    card_files = [
        "cards.yaml",
        "components.yaml",
        "components2.yaml",
        "components3.yaml",
        "design.yaml",
        "design2.yaml",
        "api1.yaml",
        "api2.yaml",
        "api3.yaml",
        "api4.yaml",
        "api5.yaml",
        "lessons.yaml",
        "lessons2.yaml",
        "lessons3.yaml",
        "examples.yaml",
        "examples2.yaml",
        "examples3.yaml",
    ]
    cards = []
    for name in card_files:
        path = ROOT / "content" / "cards" / name
        if path.exists():
            cards.extend(expand_compact_card(entry) for entry in load_yaml(path))
    rules_doc = load_yaml(Path(args.rules))
    rules = rules_doc.get("rules", []) if isinstance(rules_doc, dict) else []

    # 按官方「指南与 API 参考」目录给卡片分类（catalog）
    catalog_path = ROOT / "content" / "catalog.json"
    CLASS_CN = {
        "display": "展示",
        "container": "容器",
        "operation": "操作",
        "navigation": "导航",
        "selection": "选择",
        "input": "输入",
        "layout": "布局",
        "visual": "视觉",
        "typography": "字体",
        "motion": "动效",
        "color": "色彩",
        "a11y": "无障碍",
    }
    DESIGN_CLASS_BY_ID = [
        ("design.color", "color"),
        ("design.dark", "color"),
        ("design.font", "typography"),
        ("design.text", "typography"),
        ("design.space", "layout"),
        ("design.radius", "layout"),
        ("design.motion", "motion"),
        ("design.layout", "layout"),
        ("design.responsive", "layout"),
        ("design.tablet", "layout"),
        ("design.foldable", "layout"),
        ("design.pc", "layout"),
        ("design.maxwidth", "layout"),
        ("design.immersive", "layout"),
        ("design.icon", "visual"),
        ("design.visual", "visual"),
        ("design.a11y", "a11y"),
        ("design.ux", "ux"),
        ("design.atomic", "ux"),
    ]
    if catalog_path.exists():
        catalog = load_json(catalog_path)
        kit_map = catalog.get("kitCategory", {})
        prefixes = sorted(catalog.get("apiPrefix", []), key=lambda pair: len(pair[0]), reverse=True)
        defaults = catalog.get("domainDefaults", {})
        group_map = catalog.get("groupMap", {})
        domain_group = catalog.get("domainGroup", {})
        for card in cards:
            cid = card.get("id", "")
            domain = card.get("domain", "")
            entry = kit_map.get(cid)
            if entry is None and domain == "api":
                for prefix, info in prefixes:
                    if cid.startswith(prefix):
                        entry = info
                        break
            if entry is None:
                base = defaults.get(domain)
                if base:
                    if domain == "component":
                        cls = card.get("designClass")
                        entry = {"cat": base["cat"], "sub": CLASS_CN.get(cls, cls) if cls else base["sub"]}
                    elif domain == "design":
                        cls = card.get("designClass")
                        if not cls:
                            for prefix, mapped in DESIGN_CLASS_BY_ID:
                                if card.get("id", "").startswith(prefix):
                                    cls = mapped
                                    break
                        if cls == "ux":
                            entry = {"cat": base["cat"], "sub": "体验标准"}
                        else:
                            entry = {"cat": base["cat"], "sub": CLASS_CN.get(cls, cls) if cls else base["sub"]}
                    elif domain == "tutorial":
                        sub = "示例" if card.get("kind") == "example" else (card.get("level") or base["sub"])
                        entry = {"cat": base["cat"], "sub": sub}
                    else:
                        entry = base
            if entry:
                cat = entry.get("cat", "")
                sub = entry.get("sub", "")
                group = domain_group.get(domain)
                if not group:
                    group = group_map.get(cat, {}).get(sub) or cat
                card["catalog"] = {"cat": cat, "group": group, "sub": sub}

    # 主题补全：精编 > 官方目录（overlay）> 自动整理（不新增事实）
    kit_topics_path = ROOT / "content" / "topics" / "kits.json"
    kit_topics = {}
    if kit_topics_path.exists():
        kit_topics = load_json(kit_topics_path).get("kits", {})
    for card in cards:
        if card.get("topics"):
            card["topics_source"] = "curated"
        elif (kit_topics.get(card.get("id")) or {}).get("topics"):
            normalized = []
            for index, topic in enumerate(kit_topics[card["id"]]["topics"], start=1):
                entry = dict(topic)
                entry["id"] = f"{card.get('id')}.toc.{index}"
                normalized.append(entry)
            if len(normalized) >= 2:
                card["topics"] = normalized
                card["topics_source"] = "official-toc"
            else:
                # 官方目录只解析出 1 条（无子章节）时，退回结构化字段整理，避免主题过薄
                derived = synthesize_topics(card)
                if derived:
                    card["topics"] = derived
                    card["topics_source"] = "auto"
        else:
            derived = synthesize_topics(card)
            if derived:
                card["topics"] = derived
                card["topics_source"] = "auto"

    # 合并官方索引自动匹配的 API sources（overlay，需抽检）
    overlay_path = ROOT / "content" / "sources" / "api-sources.json"
    enriched = 0
    if overlay_path.exists():
        overlay = load_json(overlay_path).get("entries", {})
        for card in cards:
            entry = overlay.get(card.get("id"))
            if not entry or not entry.get("url"):
                continue
            existing = card.get("sources") or []
            if any(source.get("url") for source in existing):
                continue
            card["sources"] = [
                {
                    "title": entry.get("title") or "官方 API 参考",
                    "url": entry["url"],
                    "fetched": entry.get("fetched", "2026-11-05"),
                }
            ]
            card["source_method"] = "llms-index"
            enriched += 1

    errors = check_cards(cards) + check_rules(rules)
    if errors:
        print("构建失败：", file=sys.stderr)
        for err in errors:
            print(f"  - {err}", file=sys.stderr)
        return 1

    DATA.mkdir(parents=True, exist_ok=True)
    payloads = {
        "tokens.json": tokens,
        "versions.json": versions,
        "cards.json": cards,
        "rules.json": rules,
    }
    manifest = {
        "builtAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "tokensSource": tokens.get("source"),
        "tokensFetched": tokens.get("fetched"),
        "versionsCurrent": versions.get("current"),
        "versionsDefaultTarget": versions.get("defaultTarget"),
        "counts": {
            "cards": len(cards),
            "rules": len(rules),
            "versions": len(versions.get("versions", [])),
            "apiDiff": len(versions.get("apiDiff", [])),
            "cardsWithSources": sum(1 for card in cards if any(s.get("url") for s in (card.get("sources") or []))),
            "apiSourcesEnriched": enriched,
            "rulesByLayer": {
                layer: sum(1 for r in rules if r.get("layer") == layer)
                for layer in ("L1", "L2", "L3")
            },
            "tokens": sum(len(v) for v in tokens.values() if isinstance(v, dict)),
        },
        "checksums": {name: sha(payload) for name, payload in payloads.items()},
    }
    for name, payload in payloads.items():
        with (DATA / name).open("w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, separators=(",", ":"), default=str)
    with (DATA / "manifest.json").open("w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"OK  cards={len(cards)} rules={len(rules)} "
          f"layers={manifest['counts']['rulesByLayer']} -> {DATA}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
